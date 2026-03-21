"""Service layer for VerifAIMarketplace smart contract interactions."""

import hashlib
import logging
import os
from typing import Any

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from ..core.constants import CONTRACT_ABI, CONTRACT_ADDRESS, RPC_ENDPOINTS

logger = logging.getLogger(__name__)

ORACLE_PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", "")

REQUEST_STATUS = {
    0: "Pending",
    1: "Accepted",
    2: "Rejected",
    3: "PendingReview",
    4: "Resolved",
}

class MarketplaceService:

    def __init__(self) -> None:
        self.w3 = self._connect()
        self.contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(CONTRACT_ADDRESS),
            abi=CONTRACT_ABI,
        )
        oracle_pk = ORACLE_PRIVATE_KEY.strip()
        self.oracle_account = (
            self.w3.eth.account.from_key(oracle_pk) if oracle_pk else None
        )

    def _connect(self) -> Web3:
        for endpoint in RPC_ENDPOINTS:
            candidate = Web3(Web3.HTTPProvider(endpoint))
            candidate.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
            try:
                if candidate.is_connected():
                    logger.info("Connected to RPC: %s", endpoint)
                    return candidate
            except Exception:
                continue
        w3 = Web3(Web3.HTTPProvider(RPC_ENDPOINTS[0]))
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        return w3

    def _send_oracle_tx(self, fn) -> dict[str, Any]:
        """Sign and broadcast a transaction as the oracle wallet."""
        if not self.oracle_account:
            return {"success": False, "error": "ORACLE_PRIVATE_KEY not configured"}
        try:
            # Prepare base transaction params
            tx_params = {
                "from": self.oracle_account.address,
                "nonce": self.w3.eth.get_transaction_count(self.oracle_account.address),
            }

            # Attempt to estimate gas
            try:
                gas_estimate = fn.estimate_gas(tx_params)
                tx_params["gas"] = int(gas_estimate * 1.2)  # 20% margin
            except Exception as e:
                logger.warning("Gas estimation failed, using fallback: %s", e)
                tx_params["gas"] = 500000  # Conservative fallback

            # Handle gas pricing (EIP-1559 vs Legacy)
            try:
                base_fee = self.w3.eth.get_block("latest").get("baseFeePerGas")
                if base_fee:
                    tx_params["maxFeePerGas"] = base_fee * 2 + self.w3.to_wei(2, "gwei")
                    tx_params["maxPriorityFeePerGas"] = self.w3.to_wei(2, "gwei")
                else:
                    tx_params["gasPrice"] = self.w3.eth.gas_price
            except Exception:
                tx_params["gasPrice"] = self.w3.eth.gas_price

            tx = fn.build_transaction(tx_params)
            signed = self.w3.eth.account.sign_transaction(tx, self.oracle_account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            return {
                "success": True,
                "tx_hash": tx_hash.hex(),
                "block": receipt["blockNumber"],
                "gas_used": receipt["gasUsed"],
            }
        except Exception as e:
            logger.exception("Oracle tx failed")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _ruling_hash(ruling_text: str) -> bytes:
        """SHA-256 of the ruling text, returned as 32 raw bytes."""
        return hashlib.sha256(ruling_text.encode()).digest()
        
    @staticmethod
    def _to_bytes32(hex_str: str) -> bytes:
        raw = hex_str[2:] if hex_str.startswith("0x") else hex_str
        return bytes.fromhex(raw.zfill(64))

    def get_status(self) -> dict[str, Any]:
        return {
            "connected": self.w3.is_connected(),
            "chain_id": self.w3.eth.chain_id if self.w3.is_connected() else None,
            "contract_address": CONTRACT_ADDRESS,
            "oracle_address": self.oracle_account.address
            if self.oracle_account
            else None,
        }
        
    def get_request(self, request_id: str) -> dict[str, Any]:
        """Fetch the full state of a service request - useful for the AI Oracle."""
        try:
            r = self.contract.functions.requests(
                self._to_bytes32(request_id)
            ).call()
            status_int = r[5]
            return {
                "success": True,
                "request_id": request_id,
                "client": r[0],
                "provider": r[1],
                "service_index": r[2],
                "client_note": r[3],
                "escrow_amount_wei": str(r[4]),
                "status": status_int,
                "status_label": REQUEST_STATUS.get(status_int, "Unknown"),
                "completion_proof_cid": r[6],
                "ruling_hash": r[7].hex(),
                "winner": r[8],
                "funds_released": r[9],
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def post_oracle_log(self, request_id: str, ruling_text: str) -> dict[str, Any]:
        """Oracle posts the full AI log explicitly on-chain using postMessage."""
        try:
            fn = self.contract.functions.postMessage(
                self._to_bytes32(request_id), ruling_text
            )
            return self._send_oracle_tx(fn)
        except Exception as e:
            return {"success": False, "error": str(e)}

    def submit_ruling(
        self, request_id: str, ruling_text: str, winner: str
    ) -> dict[str, Any]:
        """Oracle submits ruling and pays the winner in one tx.
        We also ensure the Oracle pays to post the full text log beforehand.
        """
        try:
            # 1. Post the log permanently onto the blockchain first
            oracle_message = f"[ORACLE VERIFICATION RULING]\n{ruling_text}"
            log_res = self.post_oracle_log(request_id, oracle_message)
            if not log_res.get("success"):
                logger.error("Failed to post oracle text log: %s", log_res.get("error"))

            # 2. Submit the actual ruling & release funds
            ruling_hash = self._ruling_hash(ruling_text)
            winner_checksum = self.w3.to_checksum_address(winner)
            
            # Fetch request state for validation and logging
            try:
                req = self.get_request(request_id)
                logger.info("Submitting ruling for Request %s: Winner=%s, Escrow=%s", 
                            request_id, winner_checksum, req.get('escrow_amount_wei'))
            except Exception as e:
                logger.warning("Could not fetch request details for logging: %s", e)

            fn = self.contract.functions.submitRuling(
                self._to_bytes32(request_id),
                ruling_hash,
                winner_checksum,
            )
            result = self._send_oracle_tx(fn)
            if result["success"]:
                result["ruling_hash"] = ruling_hash.hex()
                result["winner"] = winner
                result["log_tx"] = log_res.get("tx_hash")
            return result
        except Exception as e:
            return {"success": False, "error": str(e)}
