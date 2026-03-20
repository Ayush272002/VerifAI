"""Router for test endpoints."""

from fastapi import APIRouter

router = APIRouter(tags=["test"])


@router.get("/hello")
def hello() -> dict[str, str]:
    """Test endpoint to verify frontend-backend connection."""
    return {"message": "Hello from FastAPI!"}
