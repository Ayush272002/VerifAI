"""Structured event logging for verification pipeline with blockchain integration."""

import json
import logging
from datetime import datetime
from typing import Any, Generator

logger = logging.getLogger(__name__)


class VerificationLoggingService:
    """Emit structured verification events for frontend streaming and blockchain logging."""

    @staticmethod
    def emit_stage_event(stage: str, message: str) -> dict[str, Any]:
        """Emit a stage progress event.
        
        Args:
            stage: Stage identifier (e.g., "content_analysis", "orchestration")
            message: Human-readable stage message
            
        Returns:
            Formatted SSE event dict
        """
        return {
            "event": "stage",
            "data": {
                "stage": stage,
                "message": message,
                "timestamp": datetime.utcnow().isoformat(),
            },
        }

    @staticmethod
    def emit_token_event(token: str) -> dict[str, Any]:
        """Emit a token from LLM streaming.
        
        Args:
            token: Single token to emit
            
        Returns:
            Formatted SSE event dict
        """
        return {
            "event": "token",
            "data": {"token": token},
        }

    @staticmethod
    def emit_analysis_event(file_name: str, analysis: dict[str, Any]) -> dict[str, Any]:
        """Emit file content analysis result.
        
        Args:
            file_name: Name of analyzed file
            analysis: Analysis result dict
            
        Returns:
            Formatted SSE event dict
        """
        return {
            "event": "analysis",
            "data": {
                "file_name": file_name,
                "media_type": analysis.get("media_type", "unknown"),
                "summary": analysis.get("summary", ""),
                "key_elements": analysis.get("key_elements", []),
                "timestamp": datetime.utcnow().isoformat(),
            },
        }

    @staticmethod
    def emit_agent_assignment_event(
        agent_name: str,
        focus_area: str,
        assigned_requirements: list[str],
    ) -> dict[str, Any]:
        """Emit dynamic sub-agent assignment.
        
        Args:
            agent_name: Name of the agent being spawned
            focus_area: What this agent focuses on
            assigned_requirements: Requirements it will evaluate
            
        Returns:
            Formatted SSE event dict
        """
        return {
            "event": "agent_assignment",
            "data": {
                "agent_name": agent_name,
                "focus_area": focus_area,
                "assigned_requirements": assigned_requirements,
                "timestamp": datetime.utcnow().isoformat(),
            },
        }

    @staticmethod
    def emit_requirement_check_event(
        agent_name: str,
        requirement: str,
        checked: bool,
        evidence: str,
        confidence: float,
    ) -> dict[str, Any]:
        """Emit requirement verification result from sub-agent.
        
        Args:
            agent_name: Which agent performed the check
            requirement: The requirement being checked
            checked: Whether it passed
            evidence: Evidence from the deliverable
            confidence: Confidence score (0-100)
            
        Returns:
            Formatted SSE event dict
        """
        return {
            "event": "requirement_check",
            "data": {
                "agent_name": agent_name,
                "requirement": requirement,
                "checked": checked,
                "evidence": evidence,
                "confidence": confidence,
                "timestamp": datetime.utcnow().isoformat(),
            },
        }

    @staticmethod
    def emit_final_report_event(report: dict[str, Any]) -> dict[str, Any]:
        """Emit final verification report.
        
        Args:
            report: Complete verification result
            
        Returns:
            Formatted SSE event dict
        """
        return {
            "event": "report",
            "data": {
                **report,
                "timestamp": datetime.utcnow().isoformat(),
            },
        }

    @staticmethod
    def format_sse_event(event: dict[str, Any]) -> str:
        """Convert event dict to SSE format string.
        
        Args:
            event: Event dict with 'event' and 'data' keys
            
        Returns:
            Formatted SSE string (event: type\\ndata: json\\n\\n)
        """
        event_type = event.get("event", "message")
        data = event.get("data", {})
        return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

    @staticmethod
    def build_verification_log_entry(
        request_id: str,
        seller_address: str,
        files: list[dict[str, Any]],
        requirements: list[str],
        file_analyses: list[dict[str, Any]],
        agent_assignments: list[dict[str, Any]],
        final_report: dict[str, Any],
    ) -> dict[str, Any]:
        """Build complete verification audit log for blockchain storage.
        
        Args:
            request_id: Gig request ID
            seller_address: Seller's wallet address
            files: Submitted deliverable files
            requirements: Requirements to verify
            file_analyses: Content analysis results
            agent_assignments: Sub-agents spawned
            final_report: Final verification outcome
            
        Returns:
            Complete audit log suitable for on-chain storage
        """
        return {
            "verification_id": request_id,
            "seller": seller_address,
            "timestamp": datetime.utcnow().isoformat(),
            "files_submitted": [
                {
                    "name": f.get("file_name", "unknown"),
                    "type": f.get("content_type", "unknown"),
                    "size": len(f.get("content", "")),
                }
                for f in files
            ],
            "requirements_count": len(requirements),
            "content_analyses": file_analyses,
            "agents_spawned": [
                {
                    "name": a.get("agent_name", ""),
                    "focus": a.get("focus_area", ""),
                    "requirements_assigned": len(a.get("assigned_requirements", [])),
                }
                for a in agent_assignments
            ],
            "verification_result": {
                "overall_status": final_report.get("overall_status", "unknown"),
                "completion_pct": final_report.get("completion_pct", 0),
                "confidence_pct": final_report.get("confidence_pct", 0),
                "requirements_passed": final_report.get("totals", {}).get("completed", 0),
                "requirements_total": final_report.get("totals", {}).get("total", 0),
                "summary": final_report.get("summary", ""),
            },
        }
