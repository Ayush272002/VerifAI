"""Router for IPFS storage and analysis endpoints."""

# TODO: smart_contracts - Once smart contract work is complete,
# store analysis JSON hashes on-chain separately from IPFS.
# The analysis CID from upload_file_to_ipfs should be recorded
# on the verification smart contract for immutable audit trail.

import json
from typing import Any

from fastapi import APIRouter
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import UploadFile
from pydantic import BaseModel
from pydantic import Field

from ..services.ipfs_service import IPFSService

router = APIRouter(prefix="/ipfs", tags=["ipfs"])
_ipfs_service = IPFSService()


class UploadFileResponse(BaseModel):
    """Response schema for file upload endpoint."""

    file_pin: dict[str, Any] = Field(
        ..., description="Pinata response for uploaded file"
    )
    analysis: dict[str, Any] = Field(..., description="Generated analysis payload")
    analysis_pin: dict[str, Any] | None = Field(
        None,
        description="Pinata response for uploaded analysis JSON",
    )


class UploadJsonRequest(BaseModel):
    """Request schema for JSON upload endpoint."""

    name: str = Field(..., min_length=1)
    content: dict[str, Any]
    keyvalues: dict[str, str] | None = None


@router.get("/status")
def ipfs_status() -> dict[str, Any]:
    """Check whether IPFS integration is configured.

    Returns:
        Configuration status and gateway URL
    """
    return {
        "configured": _ipfs_service.is_configured(),
        "gateway_base_url": _ipfs_service.gateway_base_url,
    }


@router.post("/upload-file", response_model=UploadFileResponse)
async def upload_file_to_ipfs(
    file: UploadFile = File(...),
    keyvalues_json: str | None = Form(None),
    upload_analysis: bool = Form(True),
) -> UploadFileResponse:
    """Upload file to IPFS and generate a starter analysis record.

    Args:
        file: Uploaded file from multipart request
        keyvalues_json: Optional JSON object for Pinata metadata keyvalues
        upload_analysis: Upload generated analysis payload to IPFS

    Returns:
        File pin details, analysis payload, and optional analysis pin details

    Raises:
        HTTPException: If input is invalid or Pinata upload fails
    """
    if not _ipfs_service.is_configured():
        raise HTTPException(status_code=500, detail="PINATA_JWT is not configured")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    keyvalues = None
    if keyvalues_json:
        try:
            parsed = json.loads(keyvalues_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid keyvalues_json: {exc}",
            ) from exc
        if not isinstance(parsed, dict):
            raise HTTPException(
                status_code=400,
                detail="keyvalues_json must be a JSON object",
            )
        if not all(
            isinstance(key, str) and isinstance(value, str)
            for key, value in parsed.items()
        ):
            raise HTTPException(
                status_code=400,
                detail="keyvalues_json values must be strings",
            )
        keyvalues = parsed

    try:
        file_pin = _ipfs_service.upload_file_bytes(
            file_name=file.filename or "upload.bin",
            file_bytes=file_bytes,
            content_type=file.content_type,
            keyvalues=keyvalues,
        )
        analysis = _ipfs_service.build_asset_analysis(
            file_name=file.filename or "upload.bin",
            file_size=len(file_bytes),
            content_type=file.content_type,
            file_bytes=file_bytes,
            file_cid=file_pin.get("IpfsHash", ""),
        )

        analysis_pin = None
        if upload_analysis:
            analysis_pin = _ipfs_service.upload_json(
                name=f"{file.filename or 'upload.bin'}-analysis.json",
                content=analysis,
                keyvalues=keyvalues,
            )

        return UploadFileResponse(
            file_pin=file_pin,
            analysis=analysis,
            analysis_pin=analysis_pin,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/upload-json")
def upload_json_to_ipfs(payload: UploadJsonRequest) -> dict[str, Any]:
    """Upload JSON payload to IPFS via Pinata.

    Args:
        payload: JSON upload parameters

    Returns:
        Pinata response and gateway URL

    Raises:
        HTTPException: If upload fails or service is not configured
    """
    try:
        return _ipfs_service.upload_json(
            name=payload.name,
            content=payload.content,
            keyvalues=payload.keyvalues,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
