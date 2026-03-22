"""Application constants and configuration."""

import json
import os
from pathlib import Path

import dotenv

dotenv.load_dotenv()

# Base Paths
BACKEND_DIR = Path(__file__).parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

# Smart Contract Configuration
INFURA_PROJECT_ID = os.getenv("INFURA_PROJECT_ID", "")
CONTRACT_ADDRESS = os.getenv(
    "CONTRACT_ADDRESS", "0xD4Fc541236927E2EAf8F27606bD7309C1Fc2cbee"
)

ORACLE_PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", "")
PINATA_JWT = os.getenv("PINATA_JWT", "")
PINATA_GATEWAY_BASE_URL = os.getenv(
    "PINATA_GATEWAY_BASE_URL", "https://gateway.pinata.cloud/ipfs"
)
PINATA_FILE_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_JSON_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"

# Agent Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL_CHOICES = {
    "text": "gemma3:4b",
    "image": "gemma3:4b",
    "reasoning": "gemma3:4b",
    "code": "gemma3:4b",
}
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", OLLAMA_MODEL_CHOICES["text"])

# Marketplace categories used for gig classification and placeholder selection
GIG_CATEGORIES = [
    "Art & Design",
    "Business",
    "Programming & Tech",
    "Marketing",
    "Writing & Translation",
    "Video & Animation",
    "Photography",
    "Music & Audio",
    "Data Science & AI",
    "Education & Tutoring",
    "Lifestyle & Hobbies",
]

RPC_ENDPOINTS = [
    f"https://sepolia.infura.io/v3/{INFURA_PROJECT_ID}"
    if INFURA_PROJECT_ID
    else "https://sepolia.base.org",
    "https://sepolia.base.org",          # Official Base Sepolia public RPC
    "https://base-sepolia-rpc.publicnode.com",
]

def load_contract_abi() -> list[dict]:
    """Load contract ABI, preferring backend-local copy and falling back to root copy."""
    candidates = [
        BACKEND_DIR / "ABI.json",
        PROJECT_ROOT / "ABI.json",
    ]

    for abi_path in candidates:
        if abi_path.exists():
            with open(abi_path, "r", encoding="utf-8") as f:
                return json.load(f)

    raise FileNotFoundError("Could not find ABI.json in backend/ or project root")


CONTRACT_ABI = load_contract_abi()
