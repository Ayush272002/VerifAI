"""FastAPI backend application."""

import dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.contract_router import router as contract_router
from .routers.ipfs_router import router as ipfs_router
from .routers.test_router import router as test_router
from .routers.agent_router  import router as agent_router


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
