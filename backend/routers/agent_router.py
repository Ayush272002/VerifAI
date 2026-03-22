"""Router for agent model endpoints."""

import base64
import json
import logging
import mimetypes
from typing import Any, Generator

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..core.data_models import FilePayload, GigCategorizationRequest
from ..core.data_models import ImageReviewRequest
from ..core.data_models import PythonFilesReviewRequest
from ..core.data_models import RequirementItem
from ..core.data_models import UnifiedVerifyRequest
from ..services.agent_service import OllamaAgentService
from ..services.hierarchical_verification_service import HierarchicalVerificationService
from ..services.ipfs_service import IPFSService
from ..services.marketplace_service import MarketplaceService
from ..services.settlement_service import SettlementService
from ..services.verification_logging_service import VerificationLoggingService
from ..services.verification_service import VerificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])
_ai_service = OllamaAgentService()
_verification_service = VerificationService()
_moa_service = HierarchicalVerificationService()
_marketplace_service = MarketplaceService()
_ipfs_service = IPFSService()
_logging_service = VerificationLoggingService()
_settlement_service = SettlementService()

# Verification result cache keyed by requestId
_verification_cache: dict[str, dict] = {}
# Set of requestIds currently being verified (duplicate prevention)
_verification_in_progress: set[str] = set()


@router.get("/health")
def health() -> dict[str, str]:
    """Return service liveness response.

    Returns:
        Health response payload
    """
    return {"message": "Agent service is available"}


@router.get("/verification-status/{request_id}")
def get_verification_status(request_id: str) -> dict[str, Any]:
    """Return cached verification result for a request, or status if in-progress/unknown."""
    if request_id in _verification_cache:
        return {"status": "completed", **_verification_cache[request_id]}
    if request_id in _verification_in_progress:
        return {"status": "in_progress"}
    return {"status": "not_found"}


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


@router.post("/work/complete-and-verify/stream")
async def stream_complete_work_with_verification(
    files: list[UploadFile] = File(...),
    requirements: str = Form(...),
    requestId: str = Form(...),
    buyerAddress: str = Form(...),
) -> StreamingResponse:
    """Complete gig work: verify deliverables and store verification on-chain.

    This integrates the full seller workflow:
    1. Upload deliverables (files)
    2. Run MoA verification against buyer requirements
    3. Stream real-time verification progress and findings
    4. Store immutable verification audit log on-chain via oracle

    Args:
        files: Uploaded deliverable files
        requirements: JSON string of requirement strings
        requestId: Work request ID
        buyerAddress: Buyer's wallet address

    Returns:
        Server-Sent Events stream with verification progress + blockchain storage confirmation
    """
    # Duplicate prevention
    if requestId in _verification_in_progress:
        raise HTTPException(status_code=409, detail="Verification already in progress for this request")
    if requestId in _verification_cache:
        raise HTTPException(status_code=409, detail="Verification already completed for this request")

    def _generator() -> Generator[str, None, None]:
        _verification_in_progress.add(requestId)
        try:
            # Parse requirements from JSON string
            requirements_list = json.loads(requirements)
            
            # Convert UploadFile objects to FilePayload objects
            file_payloads: list[FilePayload] = []
            for file in files:
                try:
                    # Read file content
                    content_bytes = file.file.read()
                    file.file.seek(0)  # Reset for potential re-reads
                    
                    # Determine MIME type
                    mime_type, _ = mimetypes.guess_type(file.filename)
                    if not mime_type:
                        mime_type = "application/octet-stream"
                    
                    # Handle different file types
                    if mime_type.startswith("image/"):
                        # For images, use base64 encoding
                        content = base64.b64encode(content_bytes).decode("utf-8")
                    else:
                        # For text/code files, decode as UTF-8
                        try:
                            content = content_bytes.decode("utf-8")
                        except UnicodeDecodeError:
                            # Fall back to base64 if not valid UTF-8
                            content = base64.b64encode(content_bytes).decode("utf-8")
                    
                    file_payloads.append(FilePayload(
                        file_name=file.filename or "unnamed",
                        content=content,
                        content_type=mime_type,
                    ))
                    logger.info("📄 Processed file: %s (%s)", file.filename, mime_type)
                except Exception as e:
                    logger.error("Failed to process file %s: %s", file.filename, e)
                    yield _logging_service.format_sse_event({
                        "event": "file_error",
                        "data": {"file": file.filename, "error": str(e)}
                    })
                    continue
            
            if not file_payloads:
                yield _logging_service.format_sse_event({
                    "event": "error",
                    "data": {"error": "No valid files were processed"}
                })
                return
            
            # Create unified verification request
            verify_request = UnifiedVerifyRequest(
                requirements_list=[RequirementItem(requirement=r) for r in requirements_list],
                seller_profile="Seller",  # Could be enhanced with actual profile data
                what_they_offer="Service",  # Could be enhanced with actual service data
                seller_description="Submitting work for verification",
                files=file_payloads,
            )
            
            verification_log = {
                "files_submitted": [f.file_name for f in file_payloads],
                "requirements": requirements_list,
                "final_report": None,
            }
            
            # Stream verification results to frontend
            for sse_line in _moa_service.stream_hierarchical_verify(verify_request.model_dump()):
                yield sse_line
                
                # Parse SSE to capture verification data for blockchain storage
                if "event: report" in sse_line:
                    logger.info("✅ Verification complete, storing on-chain...")
                    try:
                        data_start = sse_line.find("data: ") + 6
                        report_json = sse_line[data_start:].strip()
                        verification_log["final_report"] = json.loads(report_json)
                    except Exception as e:
                        logger.warning("Could not parse final report: %s", e)
                        
            # If verification succeeded, store on-chain
            if verification_log.get("final_report"):
                report = verification_log["final_report"]
                
                # Format verification summary for blockchain
                verification_summary = f"""[VERIFICATION COMPLETED]
Request ID: {requestId}
Files: {', '.join(verification_log['files_submitted'])}
Modality: {report.get('modality', 'unknown')}
Status: {report.get('overall_status', 'unknown')}
Completion: {report.get('completion_pct', 0)}%
Confidence: {report.get('confidence_pct', 0)}%
Summary: {report.get('summary', 'No summary')}
Requirements Passed: {report.get('totals', {}).get('completed', 0)}/{report.get('totals', {}).get('total', 0)}"""

                try:
                    blockchain_result = _marketplace_service.post_verification_log(
                        verification_summary,
                        requestId
                    )
                    yield _logging_service.format_sse_event({
                        "event": "blockchain_stored",
                        "data": {
                            "success": blockchain_result.get("success", False),
                            "tx_hash": blockchain_result.get("tx_hash", ""),
                            "message": "Verification results stored on-chain ✓"
                        }
                    })
                    logger.info("✅ Verification stored on blockchain: %s", blockchain_result.get("tx_hash"))
                except Exception as e:
                    logger.error("Failed to store verification on-chain: %s", e)
                    yield _logging_service.format_sse_event({
                        "event": "blockchain_error",
                        "data": {
                            "error": str(e),
                            "message": "Could not store verification on-chain, but frontend verification complete"
                        }
                    })

                # Upload verification summary to IPFS to get a proof CID for completeRequest()
                proof_cid = ""
                try:
                    if _ipfs_service.is_configured():
                        ipfs_result = _ipfs_service.upload_json(
                            name=f"verification-{requestId}.json",
                            content=verification_log,
                            keyvalues={"type": "verification", "request_id": requestId},
                        )
                        proof_cid = ipfs_result.get("IpfsHash", "")
                        logger.info("✅ Verification uploaded to IPFS: %s", proof_cid)
                    else:
                        # Fallback: use tx_hash as proof identifier
                        proof_cid = blockchain_result.get("tx_hash", "no-ipfs-configured")
                        logger.warning("IPFS not configured, using tx_hash as proof_cid")
                except Exception as e:
                    logger.error("Failed to upload verification to IPFS: %s", e)
                    proof_cid = blockchain_result.get("tx_hash", "ipfs-upload-failed")

                yield _logging_service.format_sse_event({
                    "event": "proof_cid",
                    "data": {
                        "proof_cid": proof_cid,
                        "message": "Proof CID available for on-chain completion"
                    }
                })

                # Backend-driven winner determination
                is_success = (
                    report.get("overall_status", "").lower() == "pass"
                    or report.get("completion_pct", 0) >= 60
                )
                yield _logging_service.format_sse_event({
                    "event": "settlement_ready",
                    "data": {
                        "proof_cid": proof_cid,
                        "winner_is_provider": is_success,
                        "completion_pct": report.get("completion_pct", 0),
                        "overall_status": report.get("overall_status", ""),
                    }
                })

                # Cache the result for recovery on page refresh
                _verification_cache[requestId] = {
                    "report": report,
                    "proof_cid": proof_cid,
                    "winner_is_provider": is_success,
                }

                # AUTOMATIC SETTLEMENT: Trigger fund release via LangGraph
                logger.info("🚀 Starting automatic settlement workflow for request %s", requestId)
                settlement_cache = {
                    "report": report,
                    "proof_cid": proof_cid,
                    "winner_is_provider": is_success,
                }
                
                settlement_result = _settlement_service.auto_settle(requestId, settlement_cache)
                
                yield _logging_service.format_sse_event({
                    "event": "settlement_initiated",
                    "data": {
                        "status": "processing",
                        "message": "Backend is automatically releasing funds via oracle..."
                    }
                })

                if settlement_result.get("success"):
                    logger.info("✅ Automatic settlement succeeded: %s", settlement_result)
                    yield _logging_service.format_sse_event({
                        "event": "settlement_completed",
                        "data": {
                            "success": True,
                            "winner": settlement_result.get("winner"),
                            "message": f"Funds automatically released to {settlement_result.get('winner')}"
                        }
                    })
                else:
                    logger.error("❌ Automatic settlement failed: %s", settlement_result)
                    yield _logging_service.format_sse_event({
                        "event": "settlement_failed",
                        "data": {
                            "success": False,
                            "error": settlement_result.get("error"),
                            "message": "Automatic settlement failed - frontend fallback available"
                        }
                    })

        except Exception as e:
            logger.error("Work completion verification failed: %s", e)
            yield _logging_service.format_sse_event({
                "event": "error",
                "data": {"error": str(e)}
            })
        finally:
            _verification_in_progress.discard(requestId)

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
