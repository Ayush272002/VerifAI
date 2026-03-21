"""Router for VerifAIMarketplace smart contract endpoints."""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.marketplace_service import MarketplaceService

router = APIRouter(prefix="/marketplace", tags=["marketplace"])
_svc = MarketplaceService()

class SubmitRulingBody(BaseModel):
    request_id: str
    ruling_text: str   # full AI ruling; server hashes it before writing on-chain
    winner: str        # checksum address of winning party


@router.get("/status")
def marketplace_status() -> dict[str, Any]:
    """Check Web3 connection and oracle wallet."""
    return _svc.get_status()

@router.post("/oracle/submit-ruling")
def oracle_submit_ruling(body: SubmitRulingBody) -> dict[str, Any]:
    return _svc.submit_ruling(body.request_id, body.ruling_text, body.winner)
