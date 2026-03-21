"""Router for agent model endpoints."""

from typing import Any, Generator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..core.data_models import ImageReviewRequest
from ..core.data_models import PythonFilesReviewRequest
from ..core.data_models import UnifiedVerifyRequest
from ..services.agent_service import OllamaAgentService
from ..services.verification_service import VerificationService

router = APIRouter(prefix="/agent", tags=["agent"])
_ai_service = OllamaAgentService()
_verification_service = VerificationService()


@router.get("/health")
def health() -> dict[str, str]:
    """Return service liveness response.

    Returns:
        Health response payload
    """
    return {"message": "Agent service is available"}


@router.get("/query/{query}")
def query_vlm(query: str) -> dict[str, str]:
    """Send query to Ollama model.

    Args:
        query: Prompt text

    Returns:
        Model output payload
    """
    response = _ai_service.text_query(query)
    return {"response": response}


# ------------------------------------------------------------------
# Unified two-stage pipeline (preferred)
# ------------------------------------------------------------------


@router.post("/verify/stream")
def stream_unified_verify(
    payload: UnifiedVerifyRequest,
) -> StreamingResponse:
    """Stream two-stage verification: content analysis then requirement checks.

    Accepts multiple files of any supported type (code, images, text).
    Each file is first objectively analysed, then requirements are
    checked strictly against gathered evidence.

    Args:
        payload: Unified verification request with files and requirements

    Returns:
        Server-Sent Events stream with analysis, tokens, and final report
    """

    def _generator() -> Generator[str, None, None]:
        yield from _verification_service.stream_unified_verify(
            requirements_list=[item.requirement for item in payload.requirements_list],
            seller_profile=payload.seller_profile,
            what_they_offer=payload.what_they_offer,
            files=[f.model_dump() for f in payload.files],
        )

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


# ------------------------------------------------------------------
# Legacy single-modality endpoints (backward compatible)
# ------------------------------------------------------------------


@router.post("/verify/python-files")
def verify_python_files(
    payload: PythonFilesReviewRequest,
) -> dict[str, Any]:
    """Run checklist verification for Python files.

    Args:
        payload: Python files review input payload

    Returns:
        Structured verification report
    """
    return _verification_service.review_python_files(
        requirements_list=[item.requirement for item in payload.requirements_list],
        seller_profile=payload.seller_profile,
        what_they_offer=payload.what_they_offer,
        seller_description=payload.seller_description,
        python_files=[file_input.model_dump() for file_input in payload.python_files],
    )


@router.post("/verify/image")
def verify_image_delivery(
    payload: ImageReviewRequest,
) -> dict[str, Any]:
    """Run checklist verification for image output.

    Args:
        payload: Image verification input payload

    Returns:
        Structured verification report
    """
    return _verification_service.review_image_delivery(
        requirements_list=[item.requirement for item in payload.requirements_list],
        seller_profile=payload.seller_profile,
        what_they_offer=payload.what_they_offer,
        seller_description=payload.seller_description,
        image_base64=payload.image_base64,
        image_description=payload.image_description,
    )


@router.post("/verify/python-files/stream")
def stream_verify_python_files(
    payload: PythonFilesReviewRequest,
) -> StreamingResponse:
    """Stream checklist verification for Python files with live token output.

    Args:
        payload: Python files review input payload

    Returns:
        Server-Sent Events stream with tokens and final report
    """

    def _generator() -> Generator[str, None, None]:
        yield from _verification_service.stream_review_python_files(
            requirements_list=[item.requirement for item in payload.requirements_list],
            seller_profile=payload.seller_profile,
            what_they_offer=payload.what_they_offer,
            seller_description=payload.seller_description,
            python_files=[
                file_input.model_dump() for file_input in payload.python_files
            ],
        )

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/verify/image/stream")
def stream_verify_image_delivery(
    payload: ImageReviewRequest,
) -> StreamingResponse:
    """Stream checklist verification for image output with live token output.

    Args:
        payload: Image verification input payload

    Returns:
        Server-Sent Events stream with tokens and final report
    """

    def _generator() -> Generator[str, None, None]:
        yield from _verification_service.stream_review_image_delivery(
            requirements_list=[item.requirement for item in payload.requirements_list],
            seller_profile=payload.seller_profile,
            what_they_offer=payload.what_they_offer,
            seller_description=payload.seller_description,
            image_base64=payload.image_base64,
            image_description=payload.image_description,
        )

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
