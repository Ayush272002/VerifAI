"""FastAPI backend application."""

import dotenv
import os
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .routers.agent_router import router as agent_router
from .routers.contract_router import router as contract_router
from .routers.ipfs_router import router as ipfs_router
from .routers.marketplace_router import router as marketplace_router
from .routers.test_router import router as test_router
from .routers.agent_router import router as agent_router

dotenv.load_dotenv()

# Load Civic credentials from .env
CIVIC_TOKEN = os.getenv("token")


async def civic_guardrails_middleware(prompt: str):
    headers = {
        "Authorization": f"Bearer {CIVIC_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "prompt": prompt
    }

    response = requests.post("https://nexus.civic.com/bodyguard/check", json=payload, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail="Bodyguard API failed"
        )

    data = response.json()

    threat_score = data.get("threat_score", 0)
    is_safe = data.get("is_safe", True)

    if not is_safe or threat_score > 0.5:
        raise HTTPException(
            status_code=403,
            detail="Prompt flagged as malicious"
        )

    return data

class CivicValidationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            body = await request.json()

            prompt = body.get("prompt")
            if prompt:
                await civic_guardrails_middleware(prompt)

        response = await call_next(request)
        return response

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
app.add_middleware(CivicValidationMiddleware)


app.include_router(contract_router)
app.include_router(ipfs_router)
app.include_router(test_router)
app.include_router(agent_router)
app.include_router(marketplace_router)
