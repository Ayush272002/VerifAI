"""Router for VerifAIMarketplace smart contract endpoints."""

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.marketplace_service import MarketplaceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketplace", tags=["marketplace"])
_svc = MarketplaceService()

class SubmitRulingBody(BaseModel):
    request_id: str
    ruling_text: str   # full AI ruling; server hashes it before writing on-chain
    winner: str        # checksum address of winning party


class AutoSettleBody(BaseModel):
    request_id: str


@router.get("/status")
def marketplace_status() -> dict[str, Any]:
    """Check Web3 connection and oracle wallet."""
    return _svc.get_status()

@router.post("/oracle/submit-ruling")
def oracle_submit_ruling(body: SubmitRulingBody) -> dict[str, Any]:
    return _svc.submit_ruling(body.request_id, body.ruling_text, body.winner)


@router.post("/oracle/auto-settle")
def oracle_auto_settle(body: AutoSettleBody) -> dict[str, Any]:
    """Automatically settle a request using cached verification results.

    Reads the verification cache, fetches the on-chain request to get
    provider/client addresses, determines the winner from the cached report,
    and calls submit_ruling.
    """
    from ..routers.agent_router import _verification_cache

    logger.info("Auto-settle request: %s", body.request_id)
    logger.info("Cache keys available: %s", list(_verification_cache.keys()))

    cached = _verification_cache.get(body.request_id)
    if not cached:
        logger.error("No cached verification for request_id=%s. Available keys: %s", 
                    body.request_id, list(_verification_cache.keys()))
        raise HTTPException(status_code=404, detail=f"No cached verification result for request={body.request_id}. Available: {list(_verification_cache.keys())}")

    # Fetch on-chain request to get addresses
    req = _svc.get_request(body.request_id)
    if not req.get("success"):
        logger.error("Failed to fetch request from contract: %s", req.get('error'))
        raise HTTPException(status_code=500, detail=f"Failed to fetch request from contract: {req.get('error')}")

    provider_address = req["provider"]
    client_address = req["client"]
    winner_is_provider = cached.get("winner_is_provider", False)
    winner = provider_address if winner_is_provider else client_address

    report = cached.get("report", {})
    ruling_text = json.dumps(report)

    logger.info(
        "🎯 Auto-settle request=%s winner_is_provider=%s winner=%s",
        body.request_id, winner_is_provider, winner,
    )

    result = _svc.submit_ruling(body.request_id, ruling_text, winner)
    logger.info("Auto-settle result: success=%s, details=%s", result.get("success"), result)
    return result
