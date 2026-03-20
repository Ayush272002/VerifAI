"""FastAPI backend for the Modern Next.js + FastAPI Template."""

import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from web3 import Web3
import dotenv

dotenv.load_dotenv()  

app = FastAPI()

INFURA_PROJECT_ID = os.getenv("INFURA_PROJECT_ID")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

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

# Smart Contract Configuration
RPC_ENDPOINTS = [
    f"https://sepolia.infura.io/v3/{INFURA_PROJECT_ID}",  # Infura Sepolia RPC
    "https://rpc.sepolia.org",       # Public Sepolia testnet RPC
    "https://ethereum-sepolia-rpc.publicnode.com",
]

# Initialize Web3
w3 = None
for endpoint in RPC_ENDPOINTS:
    candidate = Web3(Web3.HTTPProvider(endpoint))
    try:
        if candidate.is_connected():
            w3 = candidate
            break
    except Exception:
        continue

if w3 is None:
    # Keep the app booting even if RPC is temporarily unavailable.
    w3 = Web3(Web3.HTTPProvider(RPC_ENDPOINTS[0]))

# Load Contract ABI from file
import os
abi_path = os.path.join(os.path.dirname(__file__), "ABI.json")
with open(abi_path, "r") as f:
    CONTRACT_ABI = json.load(f)

# Create Contract Instance
contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)


@app.get("/hello")
def hello():
    """Test endpoint to verify frontend-backend connection."""
    return {"message": "Hello from FastAPI!"}


@app.get("/contract/status")
def contract_status():
    """Check if Web3 connection is working."""
    return {
        "connected": w3.is_connected(),
        "chain_id": w3.eth.chain_id,
        "contract_address": CONTRACT_ADDRESS
    }


@app.get("/contract/value")
def get_counter_value():
    """Get the current counter value from the smart contract."""
    try:
        value = contract.functions.x().call()
        return {"success": True, "counter_value": value}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/contract/increment-params/{amount}")
def get_increment_params(amount: int):
    """Get transaction data for incrementing the counter by a specific amount."""
    try:
        # This shows how to build the transaction (does not execute it)
        tx_data = contract.functions.incBy(amount).build_transaction({
            "from": "0x0000000000000000000000000000000000000000",  # Placeholder
            "gasPrice": w3.eth.gas_price,
            "nonce": 0,  # Will be set by wallet
        })
        return {
            "success": True,
            "transaction_data": {
                "to": tx_data["to"],
                "data": tx_data["data"],
                "value": tx_data.get("value", "0")
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
