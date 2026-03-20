"""FastAPI backend application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.contract_router import router as contract_router
from .routers.test_router import router as test_router

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

app.include_router(contract_router)
app.include_router(test_router)
