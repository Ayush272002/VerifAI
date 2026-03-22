"""LangGraph-based settlement workflow for automatic fund release."""

import json
import logging
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .marketplace_service import MarketplaceService

logger = logging.getLogger(__name__)


class SettlementState(TypedDict):
    """State for settlement workflow."""

    request_id: str
    cached_result: dict[str, Any]
    provider_address: str
    client_address: str
    winner: str
    request_status: int
    status: str  # pending, fetched, winner_determined, completed, failed
    error: str


class SettlementService:
    """LangGraph-based service for automatic settlement workflow."""

    def __init__(self):
        self._marketplace_svc = MarketplaceService()
        self._graph = self._build_workflow()

    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph settlement workflow."""
        workflow = StateGraph(SettlementState)

        # Node 1: Fetch on-chain request details
        def fetch_request(state: SettlementState) -> SettlementState:
            try:
                logger.info("🔍 Fetching on-chain request: %s", state["request_id"])
                req = self._marketplace_svc.get_request(state["request_id"])

                if not req.get("success"):
                    logger.error("Fetch failed: %s", req.get("error"))
                    return {
                        **state,
                        "status": "failed",
                        "error": f"Failed to fetch request: {req.get('error')}",
                    }

                logger.info(
                    "✅ Request fetched: status=%s, provider=%s, client=%s",
                    req.get("status"),
                    req["provider"],
                    req["client"],
                )
                return {
                    **state,
                    "provider_address": req["provider"],
                    "client_address": req["client"],
                    "request_status": req.get("status", -1),
                    "status": "fetched",
                }
            except Exception as e:
                logger.error("Exception fetching: %s", str(e))
                return {
                    **state,
                    "status": "failed",
                    "error": f"Exception fetching request: {str(e)}",
                }

        # Node 2: Determine winner
        def determine_winner(state: SettlementState) -> SettlementState:
            try:
                if state["status"] != "fetched":
                    return state

                # Already settled on-chain.
                if state.get("request_status") == 4:
                    logger.info("Request already resolved, skipping settlement")
                    return {
                        **state,
                        "status": "settled",
                        "error": "",
                    }

                logger.info("🎯 Determining winner from verification result...")
                report = state["cached_result"].get("report", {})
                
                # Provider wins ONLY if status is "pass" (100% completion)
                # Otherwise client gets refund
                is_success = report.get("overall_status", "").lower() == "pass"

                winner = (
                    state["provider_address"]
                    if is_success
                    else state["client_address"]
                )

                logger.info(
                    "✅ Winner determined: is_provider=%s, winner=%s",
                    is_success,
                    winner,
                )
                return {
                    **state,
                    "winner": winner,
                    "status": "winner_determined",
                }
            except Exception as e:
                logger.error("Exception determining winner: %s", str(e))
                return {
                    **state,
                    "status": "failed",
                    "error": f"Exception determining winner: {str(e)}",
                }

        # Node 3: Submit ruling and release funds
        def submit_ruling(state: SettlementState) -> SettlementState:
            try:
                if state["status"] != "winner_determined":
                    return state

                logger.info(
                    "💰 Submitting oracle ruling to release funds to: %s",
                    state["winner"],
                )
                report = state["cached_result"].get("report", {})
                ruling_text = str(report)  # Simplified for hash

                result = self._marketplace_svc.submit_ruling(
                    state["request_id"], ruling_text, state["winner"]
                )

                if not result.get("success"):
                    if state.get("request_status") != 3:
                        logger.error(
                            "Ruling failed: request status=%s (submitRuling expects PendingReview=3)",
                            state.get("request_status"),
                        )
                    logger.error("Ruling failed: %s", result.get("error"))
                    return {
                        **state,
                        "status": "failed",
                        "error": f"Ruling submission failed: {result.get('error')}",
                    }

                logger.info(
                    "🎉 Settlement completed! Funds released to %s. Tx: %s",
                    state["winner"],
                    result.get("tx_hash"),
                )
                return {
                    **state,
                    "status": "settled",
                    "error": "",
                }
            except Exception as e:
                logger.error("Exception submitting ruling: %s", str(e))
                return {
                    **state,
                    "status": "failed",
                    "error": f"Exception submitting ruling: {str(e)}",
                }

        # Build graph
        workflow.add_node("fetch_request", fetch_request)
        workflow.add_node("determine_winner", determine_winner)
        workflow.add_node("submit_ruling", submit_ruling)

        # Add edges
        workflow.add_edge(START, "fetch_request")
        workflow.add_edge("fetch_request", "determine_winner")
        workflow.add_edge("determine_winner", "submit_ruling")
        workflow.add_edge("submit_ruling", END)

        return workflow.compile()

    def auto_settle(self, request_id: str, cached_result: dict[str, Any]) -> dict[str, Any]:
        """Run the settlement workflow."""
        try:
            logger.info("🚀 Starting automatic settlement for request: %s", request_id)

            initial_state: SettlementState = {
                "request_id": request_id,
                "cached_result": cached_result,
                "provider_address": "",
                "client_address": "",
                "winner": "",
                "request_status": -1,
                "status": "pending",
                "error": "",
            }

            # Run the workflow
            final_state = self._graph.invoke(initial_state)

            if final_state["status"] == "settled":
                logger.info("✅ Settlement succeeded for %s", request_id)
                return {
                    "success": True,
                    "status": "settled",
                    "winner": final_state["winner"],
                    "request_id": request_id,
                }
            else:
                logger.error("❌ Settlement failed: %s", final_state["error"])
                return {
                    "success": False,
                    "status": final_state["status"],
                    "error": final_state["error"],
                    "request_id": request_id,
                }
        except Exception as e:
            logger.exception("Settlement workflow crashed:")
            return {
                "success": False,
                "status": "crashed",
                "error": str(e),
                "request_id": request_id,
            }
