"""FastAPI backend application."""

import logging
import dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.agent_router import router as agent_router
from .routers.contract_router import router as contract_router
from .routers.ipfs_router import router as ipfs_router
from .routers.marketplace_router import router as marketplace_router
from .routers.test_router import router as test_router

# Configure logging to show DEBUG and INFO level messages
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

dotenv.load_dotenv()

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
app.include_router(ipfs_router)
app.include_router(test_router)
app.include_router(agent_router)
app.include_router(marketplace_router)
