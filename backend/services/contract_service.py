"""Service layer for smart contract operations."""

from typing import Any

from web3 import Web3

from ..core.constants import CONTRACT_ABI, CONTRACT_ADDRESS, RPC_ENDPOINTS


class ContractService:
    """Service for interacting with smart contract.

    Attributes:
        w3: Web3 instance
        contract: Web3 contract instance
    """

    def __init__(self) -> None:
        """Initialise Web3 and contract instance."""
        self.w3 = None
        for endpoint in RPC_ENDPOINTS:
            candidate = Web3(Web3.HTTPProvider(endpoint))
            try:
                if candidate.is_connected():
                    self.w3 = candidate
                    break
            except Exception:  # pylint: disable=broad-exception-caught
                continue

        if self.w3 is None:
            # Keep the app booting even if RPC is temporarily unavailable
            self.w3 = Web3(Web3.HTTPProvider(RPC_ENDPOINTS[0]))

        self.contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI
        )

    def get_status(self) -> dict[str, Any]:
        """Check if Web3 connection is working.

        Returns:
            Dictionary containing connection status, chain ID, and contract address
        """
        return {
            "connected": self.w3.is_connected(),
            "chain_id": self.w3.eth.chain_id,
            "contract_address": CONTRACT_ADDRESS,
        }

    def get_value(self) -> dict[str, Any]:
        """Get current counter value from smart contract.

        Returns:
            Dictionary with success status and value or error message
        """
        try:
            value = self.contract.functions.x().call()
            return {"success": True, "counter_value": value}
        except Exception as e:  # pylint: disable=broad-exception-caught
            return {"success": False, "error": str(e)}

    def get_increment_params(self, amount: int) -> dict[str, Any]:
        """Get transaction data for incrementing counter.

        Args:
            amount: Amount to increment by

        Returns:
            Dictionary with transaction parameters or error message
        """
        try:
            tx_data = self.contract.functions.incBy(amount).build_transaction(
                {
                    "from": "0x0000000000000000000000000000000000000000",
                    "gasPrice": self.w3.eth.gas_price,
                    "nonce": 0,
                }
            )
            return {
                "success": True,
                "transaction_data": {
                    "to": tx_data["to"],
                    "data": tx_data["data"],
                    "value": tx_data.get("value", "0"),
                },
            }
        except Exception as e:  # pylint: disable=broad-exception-caught
            return {"success": False, "error": str(e)}
