"""Service layer for VerifAIMarketplace smart contract interactions."""

import hashlib
import logging
import os
import time
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
        
        logger.info("Oracle account: %s", self.oracle_account.address)
        
        try:
            # Prepare base transaction params
            oracle_addr = self.oracle_account.address
            
            # Check nonce state
            confirmed_nonce = self.w3.eth.get_transaction_count(oracle_addr, block_identifier="latest")
            pending_nonce = self.w3.eth.get_transaction_count(oracle_addr, block_identifier="pending")
            logger.info("Nonce check: confirmed=%s, pending=%s (pending_delta=%s)", 
                       confirmed_nonce, pending_nonce, pending_nonce - confirmed_nonce)
            
            if pending_nonce > confirmed_nonce:
                logger.warning("Pending transactions detected! There may be a stuck/pending tx with nonce %s-%s", 
                              confirmed_nonce, pending_nonce - 1)
            
            tx_params = {
                "from": oracle_addr,
                "nonce": confirmed_nonce,  # Use confirmed nonce to avoid conflicts
            }
            
            logger.info("Transaction params prepared: from=%s, nonce=%s", 
                       tx_params["from"], tx_params["nonce"])

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
                    # Use EIP-1559 for newer networks
                    max_fee_per_gas = base_fee * 2 + self.w3.to_wei(2, "gwei")
                    tx_params["maxFeePerGas"] = int(max_fee_per_gas)
                    tx_params["maxPriorityFeePerGas"] = int(self.w3.to_wei(2, "gwei"))
                    logger.info("Using EIP-1559: maxFeePerGas=%s, maxPriorityFeePerGas=%s",
                               tx_params["maxFeePerGas"], tx_params["maxPriorityFeePerGas"])
                else:
                    # Use legacy gasPrice
                    tx_params["gasPrice"] = int(self.w3.eth.gas_price * 1.1)  # 10% bump
                    logger.info("Using legacy gasPrice: %s", tx_params["gasPrice"])
            except Exception as e:
                # Fallback to legacy
                logger.warning("Gas pricing setup failed, using legacy fallback: %s", e)
                tx_params["gasPrice"] = int(self.w3.eth.gas_price * 1.1)

            tx = fn.build_transaction(tx_params)
            
            # Check oracle balance for gas
            balance = self.w3.eth.get_balance(self.oracle_account.address)
            gas_cost = tx_params.get("gas", 500000) * tx_params.get("maxFeePerGas", tx_params.get("gasPrice", 1))
            logger.info("Oracle balance check: balance=%s wei, estimated gas cost=%s wei, sufficient=%s",
                       balance, gas_cost, balance > gas_cost)
            
            logger.debug("Built transaction: to=%s, value=%s, gas=%s, data_length=%s",
                        tx.get("to"), tx.get("value"), tx.get("gas"), len(tx.get("data", "")) // 2)
            
            signed = self.w3.eth.account.sign_transaction(tx, self.oracle_account.key)
            logger.debug("Transaction signed, raw_tx length: %s bytes", len(signed.raw_transaction))
            
            # Log raw tx details
            raw_tx_hex = signed.raw_transaction.hex()
            logger.info("Raw transaction (first 200 chars): 0x%s", raw_tx_hex[:200])
            
            # Retry sending with backoff for transient errors
            max_retries = 3
            for attempt in range(1, max_retries + 1):
                try:
                    logger.info(f"Sending raw transaction (attempt {attempt}/{max_retries})...")
                    tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
                    logger.info("Transaction sent successfully: %s", tx_hash.hex())
                    break
                except Exception as send_error:
                    error_msg = str(send_error)
                    logger.error(f"Attempt {attempt} failed: {error_msg}")
                    
                    # Check if it's a transient error worth retrying
                    if "Internal error" in error_msg or "temporarily" in error_msg.lower():
                        if attempt < max_retries:
                            wait_time = 2 ** (attempt - 1)  # exponential backoff: 1s, 2s, 4s
                            logger.info(f"Transient error, retrying in {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                    
                    # Fatal error
                    logger.error("Failed to send raw transaction: %s", error_msg)
                    logger.error("Raw tx hex: 0x%s", raw_tx_hex)
                    raise
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            logger.info("Transaction receipt: tx_hash=%s, status=%s, block=%s, gas_used=%s, logs_count=%s",
                       tx_hash.hex(), receipt.get("status"), receipt["blockNumber"], 
                       receipt["gasUsed"], len(receipt.get("logs", [])))
            
            if receipt.get("status") != 1:
                logger.error("Transaction failed with status: %s", receipt.get("status"))
                return {"success": False, "error": f"Transaction reverted (status: {receipt.get('status')})"}
            
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

    def post_verification_log(self, verification_summary: str, request_id: str = "verification_audit") -> dict[str, Any]:
        """Store verification audit trail on-chain for permanent record.
        
        Args:
            verification_summary: Formatted verification results (completion %, confidence, requirements passed)
            request_id: Optional request ID to link verification to a specific work request
            
        Returns:
            Transaction result with tx_hash and success status
        """
        try:
            formatted_log = f"[VERIFICATION AUDIT LOG]\n{verification_summary}"
            fn = self.contract.functions.postMessage(
                self._to_bytes32(request_id), formatted_log
            )
            result = self._send_oracle_tx(fn)
            logger.info("Verification audit stored on-chain: request=%s, tx=%s", 
                       request_id, result.get("tx_hash"))
            return result
        except Exception as e:
            logger.error("Failed to store verification log: %s", e)
            return {"success": False, "error": str(e)}

    def submit_ruling(
        self, request_id: str, ruling_text: str, winner: str
    ) -> dict[str, Any]:
        """Oracle submits ruling and pays the winner in one tx.
        We also ensure the Oracle pays to post the full text log beforehand.
        """
        try:
            # 0. Verify oracle account is set in contract
            try:
                contract_oracle = self.contract.functions.oracle().call()
                logger.info("Contract oracle: %s, Our oracle: %s",
                           contract_oracle, self.oracle_account.address)
                if contract_oracle.lower() != self.oracle_account.address.lower():
                    logger.error("Oracle mismatch! Contract expects %s but we have %s",
                               contract_oracle, self.oracle_account.address)
            except Exception as e:
                logger.warning("Could not verify oracle address: %s", e)
            
            # 1. Post the log permanently onto the blockchain first
            oracle_message = f"[ORACLE VERIFICATION RULING]\n{ruling_text}"
            log_res = self.post_oracle_log(request_id, oracle_message)
            if not log_res.get("success"):
                logger.error("Failed to post oracle text log: %s", log_res.get("error"))

            # 2. Submit the actual ruling & release funds
            ruling_hash = self._ruling_hash(ruling_text)
            winner_checksum = self.w3.to_checksum_address(winner)
            
            # Fetch request state for validation and logging
            winner_balance_before = None
            escrow_amount = None
            try:
                req = self.get_request(request_id)
                escrow_amount = req.get('escrow_amount_wei')
                logger.info("Submitting ruling for Request %s: Winner=%s, Escrow=%s",
                            request_id, winner_checksum, escrow_amount)
                
                # Log winner's balance before
                try:
                    winner_balance_before = self.w3.eth.get_balance(winner_checksum)
                    logger.info("Winner balance before: %s wei", winner_balance_before)
                except Exception as e:
                    logger.warning("Could not get winner balance before: %s", e)
                    
            except Exception as e:
                logger.warning("Could not fetch request details for logging: %s", e)

            fn = self.contract.functions.submitRuling(
                self._to_bytes32(request_id),
                ruling_hash,
                winner_checksum,
            )
            logger.info("Calling submitRuling with: requestId=%s, ruling_hash=%s, winner=%s",
                       request_id, ruling_hash.hex(), winner_checksum)
            
            result = self._send_oracle_tx(fn)
            if result["success"]:
                result["ruling_hash"] = ruling_hash.hex()
                result["winner"] = winner
                result["log_tx"] = log_res.get("tx_hash")
                logger.info("Ruling submitted successfully: tx=%s, winner=%s, gas_used=%s",
                           result["tx_hash"], winner_checksum, result.get("gas_used"))
                
                # Log winner's balance after
                try:
                    winner_balance_after = self.w3.eth.get_balance(winner_checksum)
                    logger.info("Winner balance after: %s wei", winner_balance_after)
                    if winner_balance_before is not None:
                        difference = winner_balance_after - winner_balance_before
                        logger.info("Balance difference: %s wei (expected: %s wei)",
                                   difference, escrow_amount or 'unknown')
                except Exception as e:
                    logger.warning("Could not get winner balance after: %s", e)
            else:
                logger.error("Ruling submission failed: %s", result.get("error"))
            return result
        except Exception as e:
            return {"success": False, "error": str(e)}
