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
PINATA_JWT = os.getenv("PINATA_JWT", "")
PINATA_GATEWAY_BASE_URL = os.getenv(
    "PINATA_GATEWAY_BASE_URL", "https://gateway.pinata.cloud/ipfs"
)
PINATA_FILE_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_JSON_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"

# Agent Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

RPC_ENDPOINTS = [
    f"https://sepolia.infura.io/v3/{INFURA_PROJECT_ID}"
    if INFURA_PROJECT_ID
    else "https://rpc.sepolia.org",
    "https://rpc.sepolia.org",  # Public Sepolia testnet RPC
    "https://ethereum-sepolia-rpc.publicnode.com",
]

# Load Contract ABI from file
with open(BACKEND_DIR / "ABI.json", "r", encoding="utf-8") as f:
    CONTRACT_ABI = json.load(f)
