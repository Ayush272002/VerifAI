"""Router for smart contract endpoints."""

from typing import Any

from fastapi import APIRouter

from ..services.contract_service import ContractService

router = APIRouter(prefix="/contract", tags=["contract"])
_contract_service = ContractService()


@router.get("/status")
def contract_status() -> dict[str, Any]:
    """Check if Web3 connection is working."""
    return _contract_service.get_status()


@router.get("/value")
def get_counter_value() -> dict[str, Any]:
    """Get current counter value from smart contract."""
    return _contract_service.get_value()


@router.get("/increment-params/{amount}")
def get_increment_params(amount: int) -> dict[str, Any]:
    """Get transaction data for incrementing counter by specific amount."""
    return _contract_service.get_increment_params(amount)
