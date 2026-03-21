"""Router for agent model endpoints."""

from typing import Any, Generator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..core.data_models import GigCategorizationRequest
from ..core.data_models import ImageReviewRequest
from ..core.data_models import PythonFilesReviewRequest
from ..core.data_models import UnifiedVerifyRequest
from ..services.agent_service import OllamaAgentService
from ..services.hierarchical_verification_service import HierarchicalVerificationService
from ..services.verification_service import VerificationService

router = APIRouter(prefix="/agent", tags=["agent"])
_ai_service = OllamaAgentService()
_verification_service = VerificationService()
_moa_service = HierarchicalVerificationService()


@router.get("/health")
def health() -> dict[str, str]:
    """Return service liveness response.

    Returns:
        Health response payload
    """
    return {"message": "Agent service is available"}


@router.post("/classify-gig")
def classify_gig(payload: GigCategorizationRequest) -> dict[str, str]:
    """Classify gig into one canonical marketplace category."""
    category = _ai_service.classify_gig_category(
        payload.title,
        payload.description,
        payload.tags,
    )

    return {
        "category": category,
        "title": payload.title,
        "description": payload.description,
    }


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
        yield from _moa_service.stream_hierarchical_verify(payload.model_dump())

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



@router.post("/verify/form/service")
def verify_gig_form(payload: GigCategorizationRequest) -> dict[str, str]:
    """Validate gig form fields for consistency and coherence.

    Args:
        payload: Gig categorization request with title, description, and tags

    Returns:
        Success message if valid

    Raises:
        HTTPException: 422 if fields are inconsistent or unrelated
    """
    from fastapi import HTTPException

    print(payload)

    validation_result = _ai_service.validate_gig_fields(
        payload.title,
        payload.description,
        tags=payload.tags,
        category=payload.category
    )
    print(f"Validation result: {validation_result}")

    # Check if validation failed (contains "Outlier" or is not "complete")
    if "outlier" in validation_result.lower() or validation_result.strip().lower() != "complete":
        raise HTTPException(
            status_code=422,
            detail=validation_result
        )

    return {"msg": "Service fields validated successfully", "result": validation_result}