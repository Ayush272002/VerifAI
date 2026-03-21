"""Service layer for checklist-based verification workflows."""

import base64
import io
import json
import logging
from pathlib import Path
from typing import Any, Generator

import docx
import pypdf

from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama

from ..core.constants import OLLAMA_BASE_URL
from ..core.constants import OLLAMA_MODEL_CHOICES
from ..core import prompts


class VerificationService:
    """Service for text/code/image verification tasks.

    Supports both legacy single-modality endpoints and the new
    two-stage unified pipeline (analyse content -> verify requirements).
    """

    def __init__(self) -> None:
        """Initialise text/code and vision model clients."""
        self.code_model = ChatOllama(
            model=OLLAMA_MODEL_CHOICES["code"],
            base_url=OLLAMA_BASE_URL,
            temperature=0,
        )
        self.vision_model = ChatOllama(
            model=OLLAMA_MODEL_CHOICES["image"],
            base_url=OLLAMA_BASE_URL,
            temperature=0,
        )

    # ------------------------------------------------------------------
    # Two-stage unified pipeline
    # ------------------------------------------------------------------

    def stream_unified_verify(
        self,
        *,
        requirements_list: list[str],
        seller_profile: str,
        what_they_offer: str,
        files: list[dict[str, str]],
    ) -> Generator[str, None, None]:
        """Run two-stage verification: analyse content, then verify requirements.

        Stage 1: For each file, run a content analysis agent that
        objectively describes what the file contains. Streams tokens.

        Stage 2: Feed all analyses into a requirement verification
        agent that strictly checks requirements against evidence.

        Args:
            requirements_list: Required checklist items
            seller_profile: Seller profile description
            what_they_offer: Seller offer summary
            files: List of file dicts with file_name, content, content_type

        Yields:
            SSE-formatted chunks (stage, token, analysis, report events)
        """
        if not requirements_list:
            raise ValueError("requirements_list must contain at least one item")
        if not files:
            raise ValueError("files must contain at least one file")

        yield self._format_sse(
            "stage",
            {
                "stage": "content_analysis",
                "message": f"Analysing {len(files)} file(s)...",
            },
        )

        # Stage 1: content analysis per file
        all_analyses = []
        for file_payload in files:
            file_name = file_payload.get("file_name", "unknown")
            content = file_payload.get("content", "")
            content_type = file_payload.get("content_type", "")

            yield self._format_sse(
                "stage",
                {
                    "stage": "content_analysis",
                    "message": f"Analysing: {file_name}",
                },
            )

            try:
                analysis = yield from self._analyse_file(
                    file_name=file_name,
                    content=content,
                    content_type=content_type,
                )
                analysis["file_name"] = file_name
                all_analyses.append(analysis)

                yield self._format_sse("analysis", analysis)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                fallback = {
                    "file_name": file_name,
                    "media_type": "unknown",
                    "summary": f"Analysis failed: {exc}",
                    "key_elements": [],
                }
                all_analyses.append(fallback)
                yield self._format_sse("analysis", fallback)

        # Stage 2: requirement verification against all analyses
        yield self._format_sse(
            "stage",
            {
                "stage": "requirement_verification",
                "message": "Checking requirements against content analyses...",
            },
        )

        try:
            report = yield from self._verify_requirements(
                requirements_list=requirements_list,
                file_analyses=all_analyses,
                seller_profile=seller_profile,
                what_they_offer=what_they_offer,
            )

            report = self._normalise_checklist_report(
                requirements_list=requirements_list,
                parsed=report,
                modality="unified",
            )
            yield self._format_sse("report", report)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            error_report = {
                "modality": "unified",
                "overall_status": "fail",
                "completion_pct": 0,
                "confidence_pct": 0,
                "summary": f"Requirement verification failed: {exc}",
                "requirement_checks": [],
                "totals": {"completed": 0, "total": len(requirements_list)},
            }
            yield self._format_sse("report", error_report)

    def _analyse_file(
        self,
        *,
        file_name: str,
        content: str,
        content_type: str,
    ) -> Generator[str, None, dict[str, Any]]:
        """Run content analysis agent for a single file.

        Args:
            file_name: Name of file
            content: File content (text or base64 for images)
            content_type: MIME type

        Yields:
            SSE token events during analysis

        Returns:
            Parsed analysis dictionary
        """
        is_image = content_type.startswith("image/")

        extracted_text = content
        if content_type == "application/pdf":
            try:
                pdf_bytes = base64.b64decode(content)
                reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
                text_parts = [page.extract_text() or "" for page in reader.pages]
                extracted_text = "\n".join(text_parts)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logging.warning("Failed to parse PDF %s: %s", file_name, exc)
                extracted_text = f"Error extracting PDF content: {exc}"
        elif (
            content_type
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ):
            try:
                docx_bytes = base64.b64decode(content)
                doc = docx.Document(io.BytesIO(docx_bytes))
                text_parts = [paragraph.text for paragraph in doc.paragraphs]
                extracted_text = "\n".join(text_parts)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logging.warning("Failed to parse DOCX %s: %s", file_name, exc)
                extracted_text = f"Error extracting DOCX content: {exc}"

        if is_image:
            prompt = prompts.build_content_analysis_prompt_image()
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": (f"data:{content_type};base64,{content}"),
                    },
                ]
            )
            stream_iter = self.vision_model.stream([message])
        else:
            prompt = prompts.build_content_analysis_prompt_text(
                file_name=file_name,
                content=extracted_text,
            )
            stream_iter = self.code_model.stream(prompt)

        full_response = ""
        for chunk in stream_iter:
            token = getattr(chunk, "content", "")
            if token:
                full_response += token
                yield self._format_sse(
                    "token",
                    {
                        "token": token,
                        "type": "analysis",
                        "file": file_name,
                    },
                )

        return self._parse_json(full_response)

    def _verify_requirements(
        self,
        *,
        requirements_list: list[str],
        file_analyses: list[dict[str, object]],
        seller_profile: str,
        what_they_offer: str,
    ) -> Generator[str, None, dict[str, Any]]:
        """Run requirement verification agent against content analyses.

        Args:
            requirements_list: Checklist items
            file_analyses: Collected analyses from stage 1
            seller_profile: Seller profile for context
            what_they_offer: Offer summary for context

        Yields:
            SSE token events during verification

        Returns:
            Parsed verification report
        """
        prompt = prompts.build_requirement_verification_prompt(
            requirements_list=requirements_list,
            file_analyses=file_analyses,
            seller_profile=seller_profile,
            what_they_offer=what_they_offer,
        )

        full_response = ""
        for chunk in self.code_model.stream(prompt):
            token = getattr(chunk, "content", "")
            if token:
                full_response += token
                yield self._format_sse(
                    "token",
                    {
                        "token": token,
                        "type": "verification",
                    },
                )

        return self._parse_json(full_response)

    # ------------------------------------------------------------------
    # Legacy single-modality methods (kept for backward compatibility)
    # ------------------------------------------------------------------

    def review_python_files(
        self,
        *,
        requirements_list: list[str],
        seller_profile: str,
        what_they_offer: str,
        seller_description: str,
        python_files: list[dict[str, str]],
    ) -> dict[str, Any]:
        """Review Python files against requirement checklist.

        Args:
            requirements_list: Required checklist items
            seller_profile: Seller profile description
            what_they_offer: Seller offer summary
            seller_description: Seller description
            python_files: Python file payloads

        Returns:
            Structured verification report

        Raises:
            ValueError: If requirements list or files are empty
        """
        if not requirements_list:
            raise ValueError("requirements_list must contain at least one item")
        if not python_files:
            raise ValueError("python_files must contain at least one file")

        prompt = prompts.build_python_files_review_prompt(
            requirements_list=requirements_list,
            seller_profile=seller_profile,
            what_they_offer=what_they_offer,
            seller_description=seller_description,
            python_files=python_files,
        )
        parsed = self._invoke_json(self.code_model, prompt)
        return self._normalise_checklist_report(
            requirements_list=requirements_list,
            parsed=parsed,
            modality="python_files",
        )

    def stream_review_python_files(
        self,
        *,
        requirements_list: list[str],
        seller_profile: str,
        what_they_offer: str,
        seller_description: str,
        python_files: list[dict[str, str]],
    ) -> Generator[str, None, None]:
        """Stream Python file review with token-level output.

        Args:
            requirements_list: Required checklist items
            seller_profile: Seller profile description
            what_they_offer: Seller offer summary
            seller_description: Seller description
            python_files: Python file payloads

        Yields:
            SSE-formatted chunks with streaming tokens
        """
        if not requirements_list:
            raise ValueError("requirements_list must contain at least one item")
        if not python_files:
            raise ValueError("python_files must contain at least one file")

        prompt = prompts.build_python_files_review_prompt(
            requirements_list=requirements_list,
            seller_profile=seller_profile,
            what_they_offer=what_they_offer,
            seller_description=seller_description,
            python_files=python_files,
        )

        full_response = ""
        try:
            for chunk in self.code_model.stream(prompt):
                token = getattr(chunk, "content", "")
                if token:
                    full_response += token
                    yield self._format_sse(
                        "token",
                        {"token": token, "type": "thinking"},
                    )

            parsed = self._parse_json(full_response)
            report = self._normalise_checklist_report(
                requirements_list=requirements_list,
                parsed=parsed,
                modality="python_files",
            )
            yield self._format_sse("report", report)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            error_report = {
                "modality": "python_files",
                "overall_status": "fail",
                "completion_pct": 0,
                "confidence_pct": 0,
                "summary": f"Streaming failed: {exc}",
                "requirement_checks": [],
                "totals": {
                    "completed": 0,
                    "total": len(requirements_list),
                },
            }
            yield self._format_sse("report", error_report)

    def review_image_delivery(
        self,
        *,
        requirements_list: list[str],
        seller_profile: str,
        what_they_offer: str,
        seller_description: str,
        image_base64: str | None,
        image_description: str | None,
    ) -> dict[str, Any]:
        """Review image delivery against requirement checklist.

        Args:
            requirements_list: Required checklist items
            seller_profile: Seller profile description
            what_they_offer: Seller offer summary
            seller_description: Seller description
            image_base64: Base64-encoded image content
            image_description: Optional textual image description

        Returns:
            Structured verification report

        Raises:
            ValueError: If requirements list is empty or no image context
        """
        if not requirements_list:
            raise ValueError("requirements_list must contain at least one item")
        if not image_base64 and not image_description:
            raise ValueError(
                "Provide image_base64 or image_description for image review"
            )

        prompt = prompts.build_image_review_prompt(
            requirements_list=requirements_list,
            seller_profile=seller_profile,
            what_they_offer=what_they_offer,
            seller_description=seller_description,
            image_description=image_description,
        )

        if image_base64:
            parsed = self._invoke_json_with_image(prompt, image_base64)
        else:
            parsed = self._invoke_json(self.vision_model, prompt)

        return self._normalise_checklist_report(
            requirements_list=requirements_list,
            parsed=parsed,
            modality="image",
        )

    def stream_review_image_delivery(
        self,
        *,
        requirements_list: list[str],
        seller_profile: str,
        what_they_offer: str,
        seller_description: str,
        image_base64: str | None,
        image_description: str | None,
    ) -> Generator[str, None, None]:
        """Stream image delivery review with token-level output.

        Args:
            requirements_list: Required checklist items
            seller_profile: Seller profile description
            what_they_offer: Seller offer summary
            seller_description: Seller description
            image_base64: Base64-encoded image content
            image_description: Optional textual image description

        Yields:
            SSE-formatted chunks with streaming tokens
        """
        if not requirements_list:
            raise ValueError("requirements_list must contain at least one item")
        if not image_base64 and not image_description:
            raise ValueError(
                "Provide image_base64 or image_description for image review"
            )

        prompt = prompts.build_image_review_prompt(
            requirements_list=requirements_list,
            seller_profile=seller_profile,
            what_they_offer=what_they_offer,
            seller_description=seller_description,
            image_description=image_description,
        )

        full_response = ""
        try:
            if image_base64:
                message = HumanMessage(
                    content=[
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": (f"data:image/jpeg;base64,{image_base64}"),
                        },
                    ]
                )
                stream_iter = self.vision_model.stream([message])
            else:
                stream_iter = self.vision_model.stream(prompt)

            for chunk in stream_iter:
                token = getattr(chunk, "content", "")
                if token:
                    full_response += token
                    yield self._format_sse(
                        "token",
                        {"token": token, "type": "reasoning"},
                    )

            parsed = self._parse_json(full_response)
            report = self._normalise_checklist_report(
                requirements_list=requirements_list,
                parsed=parsed,
                modality="image",
            )
            yield self._format_sse("report", report)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            error_report = {
                "modality": "image",
                "overall_status": "fail",
                "completion_pct": 0,
                "confidence_pct": 0,
                "summary": f"Stream failed: {exc}",
                "requirement_checks": [],
                "totals": {
                    "completed": 0,
                    "total": len(requirements_list),
                },
            }
            yield self._format_sse("report", error_report)

    def preview_image_output(self, *, image_base64: str) -> str:
        """Return raw vision model output for an image.

        Args:
            image_base64: Base64-encoded image content

        Returns:
            Raw vision model text response
        """
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": "Describe this image in detail.",
                },
                {
                    "type": "image_url",
                    "image_url": (f"data:image/jpeg;base64,{image_base64}"),
                },
            ]
        )
        response = self.vision_model.invoke([message])
        content = getattr(response, "content", "")
        if isinstance(content, str):
            return content
        return str(content)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _format_sse(event_type: str, data: Any) -> str:
        """Format data as Server-Sent Event (SSE) chunk.

        Args:
            event_type: Event type identifier (token, report, etc.)
            data: Data payload (serialised to JSON)

        Returns:
            SSE-formatted string ready for streaming response
        """
        payload = json.dumps(data) if not isinstance(data, str) else data
        return f"event: {event_type}\ndata: {payload}\n\n"

    def _invoke_json(self, model: ChatOllama, prompt: str) -> dict[str, Any]:
        """Invoke model and parse JSON response.

        Args:
            model: Chat model client
            prompt: Prompt text

        Returns:
            Parsed JSON dictionary or fallback values
        """
        try:
            response = model.invoke(prompt)
            content = getattr(response, "content", "")
            if not isinstance(content, str):
                content = str(content)
            return self._parse_json(content)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            return {
                "overall_status": "fail",
                "completion_pct": 0,
                "confidence_pct": 0,
                "summary": f"Model invocation failed: {exc}",
                "requirement_checks": [],
            }

    def _invoke_json_with_image(self, prompt: str, image_base64: str) -> dict[str, Any]:
        """Invoke vision model with base64 image and parse JSON response.

        Args:
            prompt: Prompt text
            image_base64: Base64-encoded image content

        Returns:
            Parsed JSON dictionary or fallback values
        """
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": (f"data:image/jpeg;base64,{image_base64}"),
                },
            ]
        )
        try:
            response = self.vision_model.invoke([message])
            content = getattr(response, "content", "")
            if not isinstance(content, str):
                content = str(content)
            return self._parse_json(content)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            return {
                "overall_status": "fail",
                "completion_pct": 0,
                "confidence_pct": 0,
                "summary": (f"Vision model invocation failed: {exc}"),
                "requirement_checks": [],
            }

    def _parse_json(self, raw_text: str) -> dict[str, Any]:
        """Parse model JSON response with fenced-block tolerance.

        Args:
            raw_text: Raw model response

        Returns:
            Parsed dictionary or fallback structure
        """
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        return {
            "overall_status": "fail",
            "completion_pct": 0,
            "confidence_pct": 0,
            "summary": raw_text[:400],
            "requirement_checks": [],
        }

    def _normalise_checklist_report(
        self,
        *,
        requirements_list: list[str],
        parsed: dict[str, Any],
        modality: str,
    ) -> dict[str, Any]:
        """Normalise report to include mandatory requirement checklist.

        Args:
            requirements_list: Source requirement items
            parsed: Parsed model response
            modality: Verification modality label

        Returns:
            Normalised report with requirement checklist entries
        """
        raw_checks = parsed.get("requirement_checks", [])
        indexed_checks: dict[str, dict[str, Any]] = {}
        if isinstance(raw_checks, list):
            for check in raw_checks:
                if not isinstance(check, dict):
                    continue
                requirement = str(check.get("requirement", "")).strip()
                if requirement:
                    indexed_checks[requirement.lower()] = check

        checklist = []
        completed = 0
        for requirement in requirements_list:
            source = indexed_checks.get(requirement.lower(), {})
            checked = bool(source.get("checked", False))
            if checked:
                completed += 1
            checklist.append(
                {
                    "requirement": requirement,
                    "checked": checked,
                    "evidence": str(source.get("evidence", "No evidence provided")),
                }
            )

        total = len(requirements_list)
        completion_ratio = 0 if total == 0 else (completed / total)
        if completion_ratio == 1:
            overall_status = "pass"
        elif completion_ratio >= 0.6:
            overall_status = "needs_revision"
        else:
            overall_status = "fail"

        model_status = str(parsed.get("overall_status", "")).strip().lower()
        if model_status in {"pass", "needs_revision", "fail"}:
            if model_status == "fail" and overall_status != "pass":
                overall_status = "fail"
            elif model_status == "needs_revision" and overall_status == "pass":
                overall_status = "needs_revision"

        return {
            "modality": modality,
            "overall_status": overall_status,
            "completion_pct": int(completion_ratio * 100),
            "confidence_pct": int(
                parsed.get(
                    "confidence_pct",
                    parsed.get("overall_confidence", 70),
                )
            ),
            "summary": str(parsed.get("summary", "Verification completed")),
            "requirement_checks": checklist,
            "totals": {
                "completed": completed,
                "total": total,
            },
        }


def main() -> None:
    """Run local verification smoke test including backend/diddy.jpg."""
    service = VerificationService()

    python_report = service.review_python_files(
        requirements_list=[
            "Functions have return type hints",
            "Docstrings are present for public methods",
            "Code is readable and maintainable",
        ],
        seller_profile="Python backend engineer",
        what_they_offer="Code review and implementation support",
        seller_description="I deliver maintainable backend code",
        python_files=[
            {
                "file_name": "example.py",
                "content": (
                    "def add(a: int, b: int) -> int:\n"
                    '    """Add two integers."""\n'
                    "    return a + b\n"
                ),
            }
        ],
    )

    diddy_path = Path(__file__).resolve().parent.parent / "diddy.jpg"
    image_base64 = ""
    if diddy_path.exists():
        image_base64 = base64.b64encode(diddy_path.read_bytes()).decode("utf-8")
    else:
        logging.warning("diddy.jpg not found at %s", diddy_path)

    if image_base64:
        vision_preview = service.preview_image_output(
            image_base64=image_base64,
        )
        print("Vision model raw output:")
        print(vision_preview)

    image_report = service.review_image_delivery(
        requirements_list=[
            "Image has a clear subject",
            "Visual quality is acceptable",
            "Style matches brief",
        ],
        seller_profile="Creative image designer",
        what_they_offer="Marketing image assets",
        seller_description="I provide campaign-ready designs",
        image_base64=image_base64 or None,
        image_description="Test image from local code base",
    )

    print("Python review totals:")
    print(json.dumps(python_report.get("totals", {}), indent=2))
    print("Image review totals:")
    print(json.dumps(image_report.get("totals", {}), indent=2))


if __name__ == "__main__":
    main()
