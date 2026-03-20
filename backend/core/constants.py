"""Application constants and configuration."""

# Smart Contract Configuration
CONTRACT_ADDRESS = "0xD4Fc541236927E2EAf8F27606bD7309C1Fc2cbee"
RPC_ENDPOINT = "https://sepolia.drpc.org"

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
