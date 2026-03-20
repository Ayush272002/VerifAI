"""Service layer for IPFS operations via Pinata."""

import hashlib
import json
from pathlib import Path
from typing import Any

import requests

from ..core.constants import PINATA_FILE_UPLOAD_URL
from ..core.constants import PINATA_GATEWAY_BASE_URL
from ..core.constants import PINATA_JSON_UPLOAD_URL
from ..core.constants import PINATA_JWT


class IPFSService:
    """Service for uploading and describing assets stored on IPFS."""

    def __init__(self) -> None:
        """Initialise service with Pinata configuration."""
        self.pinata_jwt = self._normalise_jwt(PINATA_JWT)
        self.gateway_base_url = PINATA_GATEWAY_BASE_URL.rstrip("/")

    def is_configured(self) -> bool:
        """Return whether required Pinata credentials are present.

        Returns:
            True if JWT is configured
        """
        return bool(self.pinata_jwt)

    def _normalise_jwt(self, raw_jwt: str) -> str:
        """Normalise JWT value from environment.

        Args:
            raw_jwt: Raw JWT value from settings

        Returns:
            JWT without surrounding whitespace or Bearer prefix
        """
        token = raw_jwt.strip()
        if token.lower().startswith("bearer "):
            return token[7:].strip()
        return token

    def _auth_headers(self) -> dict[str, str]:
        """Build standard authentication headers for Pinata requests.

        Returns:
            Authorisation header map
        """
        return {"Authorization": f"Bearer {self.pinata_jwt}"}

    def _connection_error(
        self,
        *,
        operation: str,
        exc: requests.RequestException,
    ) -> ConnectionError:
        """Construct detailed connection error from Pinata response.

        Args:
            operation: Human-readable operation label
            exc: Captured requests exception

        Returns:
            ConnectionError with status and response details
        """
        detail = str(exc)
        if exc.response is not None:
            response_text = exc.response.text.strip()
            if response_text:
                detail = f"{detail}. Pinata response: {response_text[:400]}"
        return ConnectionError(f"Pinata {operation} failed: {detail}")

    def upload_file_bytes(
        self,
        *,
        file_name: str,
        file_bytes: bytes,
        content_type: str | None,
        keyvalues: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Upload file bytes to IPFS via Pinata.

        Args:
            file_name: Original file name
            file_bytes: Binary content to upload
            content_type: Declared MIME type
            keyvalues: Optional metadata key-value pairs

        Returns:
            Upload response containing IPFS hash details

        Raises:
            ValueError: If service is not configured or payload is invalid
            ConnectionError: If Pinata request fails
        """
        if not self.is_configured():
            raise ValueError("PINATA_JWT is not configured")
        if not file_bytes:
            raise ValueError("File content is empty")

        metadata = {"name": file_name}
        if keyvalues:
            metadata["keyvalues"] = keyvalues

        data = {
            "pinataMetadata": json.dumps(metadata),
            "pinataOptions": json.dumps({"cidVersion": 1}),
        }
        files = {
            "file": (
                file_name,
                file_bytes,
                content_type or "application/octet-stream",
            )
        }

        try:
            response = requests.post(
                PINATA_FILE_UPLOAD_URL,
                headers=self._auth_headers(),
                data=data,
                files=files,
                timeout=90,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise self._connection_error(
                operation="file upload",
                exc=exc,
            ) from exc

        payload = response.json()
        ipfs_hash = payload.get("IpfsHash", "")
        payload["gateway_url"] = self.gateway_url(ipfs_hash)
        return payload

    def upload_json(
        self,
        *,
        name: str,
        content: dict[str, Any],
        keyvalues: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Upload a JSON document to IPFS via Pinata.

        Args:
            name: Human-readable pin name
            content: JSON serialisable payload
            keyvalues: Optional metadata key-value pairs

        Returns:
            Upload response containing IPFS hash details

        Raises:
            ValueError: If service is not configured
            ConnectionError: If Pinata request fails
        """
        if not self.is_configured():
            raise ValueError("PINATA_JWT is not configured")

        payload = {
            "pinataMetadata": {"name": name},
            "pinataContent": content,
            "pinataOptions": {"cidVersion": 1},
        }
        if keyvalues:
            payload["pinataMetadata"]["keyvalues"] = keyvalues

        try:
            response = requests.post(
                PINATA_JSON_UPLOAD_URL,
                headers={
                    **self._auth_headers(),
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise self._connection_error(
                operation="JSON upload",
                exc=exc,
            ) from exc

        result = response.json()
        ipfs_hash = result.get("IpfsHash", "")
        result["gateway_url"] = self.gateway_url(ipfs_hash)
        return result

    def build_asset_analysis(
        self,
        *,
        file_name: str,
        file_size: int,
        content_type: str | None,
        file_bytes: bytes,
        file_cid: str,
    ) -> dict[str, Any]:
        """Build a base analysis record for downstream agent verification.

        Args:
            file_name: Uploaded file name
            file_size: Uploaded file size in bytes
            content_type: File MIME type
            file_bytes: Uploaded file bytes for checksumming
            file_cid: Primary file CID on IPFS

        Returns:
            Analysis payload suitable for additional AI verification stages
        """
        media_family = "unknown"
        if content_type:
            if content_type.startswith("image/"):
                media_family = "image"
            elif content_type.startswith("video/"):
                media_family = "video"
            elif content_type.startswith("audio/"):
                media_family = "audio"
            elif content_type.startswith("text/"):
                media_family = "text"

        return {
            "version": "1.0",
            "asset": {
                "name": file_name,
                "bytes": file_size,
                "content_type": content_type,
                "media_family": media_family,
                "sha256": hashlib.sha256(file_bytes).hexdigest(),
                "ipfs_cid": file_cid,
                "gateway_url": self.gateway_url(file_cid),
            },
            "verification": {
                "status": "pending",
                "notes": "Awaiting agentic quality checks",
            },
        }

    def gateway_url(self, ipfs_hash: str) -> str:
        """Build gateway URL for CID.

        Args:
            ipfs_hash: IPFS content identifier

        Returns:
            Gateway URL for direct retrieval
        """
        return f"{self.gateway_base_url}/{ipfs_hash}"


def main() -> None:
    """Run a local upload test using backend/diddy.jpg."""
    service = IPFSService()
    image_path = Path(__file__).resolve().parent.parent / "diddy.jpg"

    if not image_path.exists():
        raise FileNotFoundError(f"Test file not found: {image_path}")

    if not service.is_configured():
        raise ValueError("PINATA_JWT is not configured")

    file_bytes = image_path.read_bytes()
    file_pin = service.upload_file_bytes(
        file_name=image_path.name,
        file_bytes=file_bytes,
        content_type="image/jpeg",
        keyvalues={"test": "true", "source": "ipfs_service_main"},
    )

    analysis = service.build_asset_analysis(
        file_name=image_path.name,
        file_size=len(file_bytes),
        content_type="image/jpeg",
        file_bytes=file_bytes,
        file_cid=file_pin.get("IpfsHash", ""),
    )
    analysis_pin = service.upload_json(
        name=f"{image_path.name}-analysis.json",
        content=analysis,
        keyvalues={"test": "true", "type": "analysis"},
    )

    print(f"Uploaded file CID: {file_pin.get('IpfsHash', '')}")
    print(f"File gateway URL: {file_pin.get('gateway_url', '')}")
    print(f"Uploaded analysis CID: {analysis_pin.get('IpfsHash', '')}")
    print(f"Analysis gateway URL: {analysis_pin.get('gateway_url', '')}")


if __name__ == "__main__":
    main()
