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
    """Interact with the VerifAIMarketplace contract.

    Read-only calls work with no private key.
    Oracle write calls (submitRuling) require ORACLE_PRIVATE_KEY in env.
    """

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

    # ─────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────

    def _connect(self) -> Web3:
        for endpoint in RPC_ENDPOINTS:
            candidate = Web3(Web3.HTTPProvider(endpoint))
            candidate.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
            try:
                if candidate.is_connected():
                    logger.info("Connected to RPC: %s", endpoint)
                    return candidate
            except Exception:  # pylint: disable=broad-exception-caught
                continue
        # Fall back even if unreachable — prevents startup crash
        w3 = Web3(Web3.HTTPProvider(RPC_ENDPOINTS[0]))
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        return w3

    def _send_oracle_tx(self, fn) -> dict[str, Any]:
        """Sign and broadcast a transaction as the oracle wallet."""
        if not self.oracle_account:
            return {"success": False, "error": "ORACLE_PRIVATE_KEY not configured"}
        try:
            tx = fn.build_transaction(
                {
                    "from": self.oracle_account.address,
                    "nonce": self.w3.eth.get_transaction_count(
                        self.oracle_account.address
                    ),
                    "gasPrice": self.w3.eth.gas_price,
                }
            )
            signed = self.w3.eth.account.sign_transaction(tx, self.oracle_account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            return {
                "success": True,
                "tx_hash": tx_hash.hex(),
                "block": receipt["blockNumber"],
                "gas_used": receipt["gasUsed"],
            }
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.exception("Oracle tx failed")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _to_bytes32(hex_str: str) -> bytes:
        """Convert a 0x-prefixed hex string to a 32-byte value."""
        raw = hex_str[2:] if hex_str.startswith("0x") else hex_str
        return bytes.fromhex(raw.zfill(64))

    @staticmethod
    def _ruling_hash(ruling_text: str) -> bytes:
        """SHA-256 of the ruling text, returned as 32 raw bytes."""
        return hashlib.sha256(ruling_text.encode()).digest()

    # ─────────────────────────────────────────────
    # Connection / status
    # ─────────────────────────────────────────────

    def get_status(self) -> dict[str, Any]:
        return {
            "connected": self.w3.is_connected(),
            "chain_id": self.w3.eth.chain_id if self.w3.is_connected() else None,
            "contract_address": CONTRACT_ADDRESS,
            "oracle_address": self.oracle_account.address
            if self.oracle_account
            else None,
        }

    # ─────────────────────────────────────────────
    # READ — Service Registry
    # ─────────────────────────────────────────────

    def get_services(self, provider: str) -> dict[str, Any]:
        """Return all services listed by a provider wallet."""
        try:
            raw = self.contract.functions.getServices(
                self.w3.to_checksum_address(provider)
            ).call()
            services = [
                {
                    "index": i,
                    "title": s[0],
                    "description": s[1],
                    "price_wei": str(s[2]),
                    "price_eth": str(Web3.from_wei(s[2], "ether")),
                    "active": s[3],
                }
                for i, s in enumerate(raw)
            ]
            return {"success": True, "provider": provider, "services": services}
        except Exception as e:  # pylint: disable=broad-exception-caught
            return {"success": False, "error": str(e)}

    # ─────────────────────────────────────────────
    # READ — Service Requests
    # ─────────────────────────────────────────────

    def get_request(self, request_id: str) -> dict[str, Any]:
        """Fetch the full state of a service request."""
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
                "escrow_amount_eth": str(Web3.from_wei(r[4], "ether")),
                "status": status_int,
                "status_label": REQUEST_STATUS.get(status_int, "Unknown"),
                "completion_proof_cid": r[6],
                "ruling_hash": r[7].hex(),
                "winner": r[8],
                "funds_released": r[9],
            }
        except Exception as e:  # pylint: disable=broad-exception-caught
            return {"success": False, "error": str(e)}

    def get_messages(self, request_id: str) -> dict[str, Any]:
        """Return the full on-chain message thread for a request."""
        try:
            raw = self.contract.functions.getMessages(
                self._to_bytes32(request_id)
            ).call()
            messages = [
                {
                    "index": i,
                    "sender": m[0],
                    "text": m[1],
                    "timestamp": m[2],
                }
                for i, m in enumerate(raw)
            ]
            return {"success": True, "request_id": request_id, "messages": messages}
        except Exception as e:  # pylint: disable=broad-exception-caught
            return {"success": False, "error": str(e)}

    # ─────────────────────────────────────────────
    # FRONTEND TX BUILDERS
    # These return unsigned tx data so the frontend wallet can sign.
    # ─────────────────────────────────────────────

    def _build_tx_data(self, fn, sender: str, value_wei: int = 0) -> dict[str, Any]:
        """Return the minimal tx payload for a wagmi/viem sendTransaction call."""
        try:
            data = fn.build_transaction(
                {
                    "from": self.w3.to_checksum_address(sender),
                    "value": value_wei,
                    "gasPrice": self.w3.eth.gas_price,
                    "nonce": 0,
                }
            )
            return {
                "success": True,
                "to": data["to"],
                "data": data["data"],
                "value": str(value_wei),
            }
        except Exception as e:  # pylint: disable=broad-exception-caught
            return {"success": False, "error": str(e)}

    def build_add_service_tx(
        self, sender: str, title: str, description: str, price_wei: int
    ) -> dict[str, Any]:
        fn = self.contract.functions.addService(title, description, price_wei)
        return self._build_tx_data(fn, sender)

    def build_remove_service_tx(self, sender: str, service_index: int) -> dict[str, Any]:
        fn = self.contract.functions.removeService(service_index)
        return self._build_tx_data(fn, sender)

    def build_request_service_tx(
        self, sender: str, provider: str, service_index: int, client_note: str, price_wei: int
    ) -> dict[str, Any]:
        fn = self.contract.functions.requestService(
            self.w3.to_checksum_address(provider), service_index, client_note
        )
        return self._build_tx_data(fn, sender, value_wei=price_wei)

    def build_accept_request_tx(self, sender: str, request_id: str) -> dict[str, Any]:
        fn = self.contract.functions.acceptRequest(self._to_bytes32(request_id))
        return self._build_tx_data(fn, sender)

    def build_reject_request_tx(self, sender: str, request_id: str) -> dict[str, Any]:
        fn = self.contract.functions.rejectRequest(self._to_bytes32(request_id))
        return self._build_tx_data(fn, sender)

    def build_complete_request_tx(
        self, sender: str, request_id: str, proof_cid: str
    ) -> dict[str, Any]:
        fn = self.contract.functions.completeRequest(
            self._to_bytes32(request_id), proof_cid
        )
        return self._build_tx_data(fn, sender)

    def build_post_message_tx(
        self, sender: str, request_id: str, text: str
    ) -> dict[str, Any]:
        fn = self.contract.functions.postMessage(
            self._to_bytes32(request_id), text
        )
        return self._build_tx_data(fn, sender)

    # ─────────────────────────────────────────────
    # ORACLE — autonomous ruling (signed server-side)
    # ─────────────────────────────────────────────

    def submit_ruling(
        self, request_id: str, ruling_text: str, winner: str
    ) -> dict[str, Any]:
        """Oracle submits ruling and pays the winner in one tx.

        Args:
            request_id: The 0x-prefixed bytes32 request ID.
            ruling_text: The full AI ruling text (will be SHA-256 hashed on-chain).
            winner: Checksum address of the winning party.
        """
        try:
            ruling_hash = self._ruling_hash(ruling_text)
            fn = self.contract.functions.submitRuling(
                self._to_bytes32(request_id),
                ruling_hash,
                self.w3.to_checksum_address(winner),
            )
            result = self._send_oracle_tx(fn)
            if result["success"]:
                result["ruling_hash"] = ruling_hash.hex()
                result["winner"] = winner
            return result
        except Exception as e:  # pylint: disable=broad-exception-caught
            return {"success": False, "error": str(e)}
