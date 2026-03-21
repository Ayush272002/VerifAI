"""Prompt templates and rubrics for verification agents."""

import json


TEXT_AGENT_RUBRICS = {
    "requirements_alignment_agent": (
        "Check whether output satisfies user requirements list"
    ),
    "clarity_quality_agent": "Assess clarity, structure, and readability",
    "text_originality_risk_agent": (
        "Estimate originality risk and cite suspicious patterns"
    ),
    "code_quality_agent": "Review correctness, maintainability, and safety",
    "essay_quality_agent": (
        "Assess argument quality, coherence, and evidence strength"
    ),
}

IMAGE_AGENT_RUBRICS = {
    "requirements_alignment_agent": (
        "Check whether image output satisfies user requirements list"
    ),
    "image_quality_agent": ("Assess composition, clarity, and technical presentation"),
    "style_consistency_agent": (
        "Check style consistency with brief and seller description"
    ),
}


def get_rubric(*, modality: str, agent_name: str) -> str:
    """Return rubric text for selected agent.

    Args:
        modality: Verification modality
        agent_name: Agent identifier

    Returns:
        Rubric text for selected agent
    """
    if modality == "image":
        return IMAGE_AGENT_RUBRICS.get(agent_name, "Evaluate quality")
    return TEXT_AGENT_RUBRICS.get(agent_name, "Evaluate quality")


def build_verification_prompt(
    *,
    agent_name: str,
    rubric: str,
    context: dict[str, object],
) -> str:
    """Build verification prompt for model execution.

    Args:
        agent_name: Agent identifier
        rubric: Agent-specific rubric
        context: Shared verification context

    Returns:
        Prompt string for language model
    """
    return (
        "You are a verification agent for a freelance marketplace. "
        "Assess delivery against provided context. "
        "Return strict JSON with keys: verdict, score, confidence, "
        "summary, risks, recommendations. "
        "verdict must be one of pass, needs_revision, fail. "
        "score and confidence must be integers 0-100. "
        f"Agent: {agent_name}. "
        f"Rubric: {rubric}. "
        f"Context JSON: {json.dumps(context, ensure_ascii=True)}"
    )


def build_python_files_review_prompt(
    *,
    requirements_list: list[str],
    seller_profile: str,
    what_they_offer: str,
    seller_description: str,
    python_files: list[dict[str, str]],
) -> str:
    """Build prompt for checklist review of Python files.

    Args:
        requirements_list: Checklist requirements
        seller_profile: Seller profile details
        what_they_offer: Seller offer summary
        seller_description: Seller description
        python_files: Python file payloads

    Returns:
        Prompt for strict JSON checklist review
    """
    truncated_files = []
    for file_payload in python_files:
        truncated_files.append(
            {
                "file_name": file_payload.get("file_name", "unknown.py"),
                "content": file_payload.get("content", "")[:4000],
            }
        )

    context = {
        "requirements_list": requirements_list,
        "seller_profile": seller_profile,
        "what_they_offer": what_they_offer,
        "seller_description": seller_description,
        "python_files": truncated_files,
    }
    return (
        "You are a senior Python code reviewer. "
        "Evaluate supplied Python files against requirements checklist. "
        "Return strict JSON with keys: overall_status, overall_score, "
        "overall_confidence, summary, requirement_checks. "
        "overall_status must be one of pass, needs_revision, fail. "
        "requirement_checks must be a list of objects with keys: "
        "requirement, checked, evidence. "
        f"Context JSON: {json.dumps(context, ensure_ascii=True)}"
    )


def build_image_review_prompt(
    *,
    requirements_list: list[str],
    seller_profile: str,
    what_they_offer: str,
    seller_description: str,
    image_description: str | None,
) -> str:
    """Build prompt for checklist review of image deliverables.

    Args:
        requirements_list: Checklist requirements
        seller_profile: Seller profile details
        what_they_offer: Seller offer summary
        seller_description: Seller description
        image_description: Optional image description

    Returns:
        Prompt for strict JSON image checklist review
    """
    context = {
        "requirements_list": requirements_list,
        "seller_profile": seller_profile,
        "what_they_offer": what_they_offer,
        "seller_description": seller_description,
        "image_description": image_description,
    }
    return (
        "You are a visual quality and requirement verifier. "
        "Evaluate provided image against checklist requirements. "
        "Return strict JSON with keys: overall_status, overall_score, "
        "overall_confidence, summary, requirement_checks. "
        "overall_status must be one of pass, needs_revision, fail. "
        "requirement_checks must be a list of objects with keys: "
        "requirement, checked, evidence. "
        f"Context JSON: {json.dumps(context, ensure_ascii=True)}"
    )


# --- Two-stage pipeline prompts -------------------------------------------


def build_content_analysis_prompt_text(
    *,
    file_name: str,
    content: str,
) -> str:
    """Build prompt for objective content analysis of text/code file.

    Args:
        file_name: Name of file being analysed
        content: Truncated file content

    Returns:
        Prompt instructing model to produce objective summary
    """
    return (
        "You are a content analysis agent. "
        "Your ONLY job is to objectively describe WHAT this file contains. "
        "Do NOT evaluate quality or make judgements. "
        "Focus on: file type, language, what the code/text does, "
        "key structures (functions, classes, sections), "
        "and any notable patterns.\n\n"
        "Return strict JSON with keys:\n"
        "  file_name: string\n"
        "  media_type: one of 'code', 'text', 'data', 'unknown'\n"
        "  language: string (eg: 'python', 'english', 'json')\n"
        "  summary: string (2-4 sentence objective description)\n"
        "  key_elements: list of strings (functions, classes, sections found)\n\n"
        f"File name: {file_name}\n"
        f"Content (truncated to 4000 chars):\n{content[:4000]}"
    )


def build_content_analysis_prompt_image() -> str:
    """Build prompt for objective content analysis of image file.

    Returns:
        Prompt instructing VLM to describe image content objectively
    """
    return (
        "You are a content analysis agent. "
        "Your ONLY job is to objectively describe WHAT this image shows. "
        "Do NOT evaluate quality or make judgements. "
        "Describe: the subject matter, objects present, colours, "
        "composition, text if any, and overall scene.\n\n"
        "Return strict JSON with keys:\n"
        "  media_type: 'image'\n"
        "  summary: string (2-4 sentence objective description)\n"
        "  key_elements: list of strings (objects, subjects, elements found)\n"
        "  contains_text: boolean\n"
        "  text_content: string (any text visible in image, empty if none)"
    )


def build_requirement_verification_prompt(
    *,
    requirements_list: list[str],
    file_analyses: list[dict[str, object]],
    seller_profile: str,
    what_they_offer: str,
) -> str:
    """Build prompt for requirement checking against content analyses.

    The requirement checker only sees objective content analyses, NOT
    seller descriptions or marketing claims. This prevents the model
    from using seller self-descriptions as evidence.

    Args:
        requirements_list: Checklist requirements
        file_analyses: List of content analysis results from stage 1
        seller_profile: Seller profile for context only
        what_they_offer: Offer summary for context only

    Returns:
        Prompt for strict requirement verification
    """
    context = {
        "requirements_list": requirements_list,
        "file_analyses": file_analyses,
        "seller_profile": seller_profile,
        "what_they_offer": what_they_offer,
    }
    return (
        "You are a strict requirement verification agent. "
        "You have received objective content analyses from specialist agents. "
        "Your job is to check each requirement STRICTLY against the "
        "content analysis evidence.\n\n"
        "CRITICAL RULES:\n"
        "- A requirement is ONLY 'checked: true' if the content analysis "
        "provides DIRECT evidence from the actual file content\n"
        "- Seller descriptions, profiles, or marketing claims are NOT evidence\n"
        "- If the content type does not match the requirement domain "
        "(eg: code requirements for an image file), mark as 'checked: false' "
        "with evidence explaining the mismatch\n"
        "- Be strict: when in doubt, mark as false\n\n"
        "Return strict JSON with keys:\n"
        "  overall_status: one of 'pass', 'needs_revision', 'fail'\n"
        "  summary: string (brief assessment of deliverables)\n"
        "  requirement_checks: list of objects with keys: "
        "requirement, checked, evidence\n\n"
        f"Context JSON: {json.dumps(context, ensure_ascii=True)}"
    )
