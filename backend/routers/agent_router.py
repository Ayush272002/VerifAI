"""Router for test endpoints."""

from fastapi import APIRouter
from ..services.google_genai_service import GoogleGenAIService

router = APIRouter(tags=["agent"])
_google_genai_service = GoogleGenAIService()

@router.get("/vlm")
def hello() -> dict[str, str]:
    """Test endpoint to verify frontend-backend connection."""
    return {"message": "Hello from vlm!"}

@router.get("/vlm/query/{query}")
def query_vlm(query: str) -> dict[str, str]:
    """Endpoint to send a query to the Gemini model and return the response."""
    response = _google_genai_service.textQuery(query)
    return {"response": response}