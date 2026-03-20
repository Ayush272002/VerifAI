"""Router for agent model endpoints."""

from fastapi import APIRouter

from ..services.agent_service import OllamaAgentService

router = APIRouter(prefix="/agent", tags=["agent"])
_ai_service = OllamaAgentService()


@router.get("/health")
def health() -> dict[str, str]:
    """Return service liveness response.

    Returns:
        Health response payload
    """
    return {"message": "Agent service is available"}


@router.get("/query/{query}")
def query_vlm(query: str) -> dict[str, str]:
    """Send query to Ollama model.

    Args:
        query: Prompt text

    Returns:
        Model output payload
    """
    response = _ai_service.text_query(query)
    return {"response": response}
