"""FastAPI backend for the Modern Next.js + FastAPI Template."""

import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from web3 import Web3

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

# Smart Contract Configuration
CONTRACT_ADDRESS = "0xD4Fc541236927E2EAf8F27606bD7309C1Fc2cbee"
RPC_ENDPOINT = "https://sepolia.drpc.org"  # Update to your RPC endpoint

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_ENDPOINT))

# Load Contract ABI
CONTRACT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "by",
                "type": "uint256"
            }
        ],
        "name": "Increment",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "inc",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "by",
                "type": "uint256"
            }
        ],
        "name": "incBy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "x",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

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
