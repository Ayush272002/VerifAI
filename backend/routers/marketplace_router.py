"""Router for VerifAIMarketplace smart contract endpoints."""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.marketplace_service import MarketplaceService

router = APIRouter(prefix="/marketplace", tags=["marketplace"])
_svc = MarketplaceService()


# ─────────────────────────────────────────────
# Request bodies
# ─────────────────────────────────────────────


class AddServiceBody(BaseModel):
    title: str
    description: str
    price_wei: int


class RemoveServiceBody(BaseModel):
    service_index: int


class RequestServiceBody(BaseModel):
    provider: str
    service_index: int
    client_note: str
    price_wei: int  # must match providerServices[provider][serviceIndex].priceWei


class CompleteRequestBody(BaseModel):
    request_id: str
    proof_cid: str


class PostMessageBody(BaseModel):
    request_id: str
    text: str


class SubmitRulingBody(BaseModel):
    request_id: str
    ruling_text: str   # full AI ruling; server hashes it before writing on-chain
    winner: str        # checksum address of winning party


# ─────────────────────────────────────────────
# Status
# ─────────────────────────────────────────────


@router.get("/status")
def marketplace_status() -> dict[str, Any]:
    """Check Web3 connection and oracle wallet."""
    return _svc.get_status()


# ─────────────────────────────────────────────
# READ — Service registry
# ─────────────────────────────────────────────


@router.get("/services/{provider}")
def get_services(provider: str) -> dict[str, Any]:
    """Return all services listed by a provider wallet address."""
    return _svc.get_services(provider)


# ─────────────────────────────────────────────
# READ — Requests + messages
# ─────────────────────────────────────────────


@router.get("/request/{request_id}")
def get_request(request_id: str) -> dict[str, Any]:
    """Fetch the full state of a service request by its bytes32 ID."""
    return _svc.get_request(request_id)


@router.get("/request/{request_id}/messages")
def get_messages(request_id: str) -> dict[str, Any]:
    """Return the full on-chain message thread for a service request."""
    return _svc.get_messages(request_id)


# ─────────────────────────────────────────────
# TX BUILDERS — unsigned payloads for the frontend wallet to sign
# ─────────────────────────────────────────────


@router.post("/tx/add-service")
def tx_add_service(body: AddServiceBody) -> dict[str, Any]:
    """Build an unsigned addService() transaction for the provider's wallet."""
    return _svc.build_add_service_tx(body.title, body.description, body.price_wei)


@router.post("/tx/remove-service")
def tx_remove_service(body: RemoveServiceBody) -> dict[str, Any]:
    """Build an unsigned removeService() transaction for the provider's wallet."""
    return _svc.build_remove_service_tx(body.service_index)


@router.post("/tx/request-service")
def tx_request_service(body: RequestServiceBody) -> dict[str, Any]:
    """Build an unsigned requestService() + ETH lock transaction for the client's wallet."""
    return _svc.build_request_service_tx(
        body.provider, body.service_index, body.client_note, body.price_wei
    )


@router.post("/tx/accept-request")
def tx_accept_request(request_id: str) -> dict[str, Any]:
    """Build an unsigned acceptRequest() transaction for the provider's wallet."""
    return _svc.build_accept_request_tx(request_id)


@router.post("/tx/reject-request")
def tx_reject_request(request_id: str) -> dict[str, Any]:
    """Build an unsigned rejectRequest() transaction for the provider's wallet."""
    return _svc.build_reject_request_tx(request_id)


@router.post("/tx/complete-request")
def tx_complete_request(body: CompleteRequestBody) -> dict[str, Any]:
    """Build an unsigned completeRequest() + proof CID transaction for the provider's wallet."""
    return _svc.build_complete_request_tx(body.request_id, body.proof_cid)


@router.post("/tx/post-message")
def tx_post_message(body: PostMessageBody) -> dict[str, Any]:
    """Build an unsigned postMessage() transaction (A or B can call this)."""
    return _svc.build_post_message_tx(body.request_id, body.text)


# ─────────────────────────────────────────────
# ORACLE — server signs and broadcasts
# ─────────────────────────────────────────────


@router.post("/oracle/submit-ruling")
def oracle_submit_ruling(body: SubmitRulingBody) -> dict[str, Any]:
    """Oracle endpoint: AI ruling text is hashed and written on-chain; winner is paid.

    Called autonomously by the agent service after reviewing proof from IPFS.
    Requires ORACLE_PRIVATE_KEY env var.
    """
    return _svc.submit_ruling(body.request_id, body.ruling_text, body.winner)
