"""FastAPI backend application."""

import dotenv
import os
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routers.contract_router import router as contract_router
from .routers.ipfs_router import router as ipfs_router
from .routers.test_router import router as test_router
from .routers.agent_router import router as agent_router

dotenv.load_dotenv()

# Load Civic credentials from .env
CIVIC_URL = os.getenv("civicURL")
CIVIC_TOKEN = os.getenv("token")

def validate_with_civic(request: Request):
    """Validate the request using Civic API."""
    headers = {"Authorization": f"Bearer {CIVIC_TOKEN}"}
    payload = {"request": request.json()}

    response = requests.post(CIVIC_URL, json=payload, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=403, detail="Request validation failed with Civic.")
    
    civic_response = response.json()
    if not civic_response.get("is_safe", False):
        raise HTTPException(status_code=403, detail="Request contains malicious content.")

    return civic_response

app = FastAPI()

# Allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        # "https://yoursite.com",  # Production (uncomment and replace)
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def civic_guardrails_middleware(request: Request, call_next):
    """Middleware to validate AI prompts using Civic."""
    try:
        body = await request.json()

        # Assumes prompt is in the "user_input" field of the request body
        if "user_input" in body
            user_input = body["user_input"]
            validate_with_civic(user_input)

        response = await call_next(request)
        return response
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

app.include_router(contract_router)
app.include_router(ipfs_router)
app.include_router(test_router)
app.include_router(agent_router)
