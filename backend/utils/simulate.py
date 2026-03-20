import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from backend.services.marketplace_service import MarketplaceService
from web3 import Web3

def run_simulation():
    print("--- Starting Marketplace Simulation on Base Sepolia ---")
    
    svc = MarketplaceService()
    if not svc.get_status()["connected"]:
        print("Not connected to RPC!")
        return

    # 1. Oracle Wallet (Provider + AI Agent)
    oracle_pk = os.getenv("ORACLE_PRIVATE_KEY", "")
    oracle_account = svc.w3.eth.account.from_key(oracle_pk)
    oracle_addr = oracle_account.address
    print(f"Oracle/Provider Address: {oracle_addr}")
    
    balance = svc.w3.eth.get_balance(oracle_addr)
    print(f"Oracle Balance: {Web3.from_wei(balance, 'ether')} ETH")
    if balance < Web3.to_wei(0.005, 'ether'):
        print("Not enough ETH to fund the simulation!")
        return

    # 2. Generate Temp Client Wallet
    client_account = svc.w3.eth.account.create()
    client_addr = client_account.address
    client_pk = client_account.key.hex()
    print(f"\nGenerated Client Address: {client_addr}")
    
    def send_tx(tx_dict, private_key, from_addr):
        tx_dict["from"] = from_addr
        tx_dict["nonce"] = svc.w3.eth.get_transaction_count(from_addr)
        tx_dict["chainId"] = svc.w3.eth.chain_id
        tx_dict["value"] = int(tx_dict.get("value", 0))
        tx_dict["gasPrice"] = svc.w3.eth.gas_price
        
        if not tx_dict.get("success", True):
            print(f"FAILED TO BUILD TX: {tx_dict.get('error')}")
            sys.exit(1)
            
        # Clean 'success' if it exists from the service builder
        if "success" in tx_dict:
            del tx_dict["success"]
            
        # Estimate gas
        try:
            tx_dict["gas"] = svc.w3.eth.estimate_gas(tx_dict)
        except Exception as e:
            print(f"Gas estimation failed: {e}")
            tx_dict["gas"] = 500000 # hardcoded fallback
            
        print(f"  Sending tx (from: {from_addr}, value: {tx_dict['value']})...")
        signed = svc.w3.eth.account.sign_transaction(tx_dict, private_key)
        tx_hash = svc.w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"  Tx Hash: {tx_hash.hex()} ... waiting")
        receipt = svc.w3.eth.wait_for_transaction_receipt(tx_hash)
        if receipt['status'] != 1:
            raise Exception(f"Transaction reverted! Hash: {tx_hash.hex()}")
        print(f"  Confirmed in block {receipt['blockNumber']}")
        return receipt

    # 3. Fund Client
    print("\n[1] Funding Client Wallet with 0.002 ETH")
    fund_tx = {
        "to": client_addr,
        "value": Web3.to_wei(0.002, 'ether'),
        "gasPrice": svc.w3.eth.gas_price
    }
    send_tx(fund_tx, oracle_pk, oracle_addr)

    # 4. A Adds Service
    print("\n[2] Provider lists a new service")
    price_wei = Web3.to_wei(0.0005, 'ether')
    add_tx = svc.build_add_service_tx(oracle_addr, "Test Service", "Simulated flow", price_wei)
    send_tx(add_tx, oracle_pk, oracle_addr)
    
    # Grab the last one from the registry
    services = svc.get_services(oracle_addr)["services"]
    test_idx = services[-1]["index"]
    print(f"  -> Added Service Index: {test_idx}")

    # 5. B Requests Service
    print("\n[3] Client requests the service")
    req_tx = svc.build_request_service_tx(client_addr, oracle_addr, test_idx, "Need this ASAP", price_wei)
    receipt = send_tx(req_tx, client_pk, client_addr)
    
    # Extract requestId from logs: topic[1]
    request_id_hex = receipt['logs'][0]['topics'][1].hex()
    print(f"  -> Created Request ID: {request_id_hex}")

    # 6. A Accepts
    print("\n[4] Provider accepts request")
    accept_tx = svc.build_accept_request_tx(oracle_addr, request_id_hex)
    send_tx(accept_tx, oracle_pk, oracle_addr)

    # 7. A Completes
    print("\n[5] Provider uploads proof (completes)")
    complete_tx = svc.build_complete_request_tx(oracle_addr, request_id_hex, "ipfs://QmSimulatedProof123")
    send_tx(complete_tx, oracle_pk, oracle_addr)
    
    req_obj = svc.get_request(request_id_hex)
    print(f"  -> Request Status: {req_obj['status_label']} (expecting PendingReview)")

    # 8. Oracle Reviews and Submits Ruling (wins = Provider)
    print("\n[6] Oracle agent submits autonomous ruling")
    ruling_txt = "Simulated evaluation: Perfect work."
    ruling_res = svc.submit_ruling(request_id_hex, ruling_txt, oracle_addr)
    if ruling_res["success"]:
        print(f"  -> Ruling submitted successfully! Tx: {ruling_res['tx_hash']}")
    else:
        print(f"  -> Ruling failed: {ruling_res['error']}")
        
    final_req = svc.get_request(request_id_hex)
    print(f"\nSimulation Complete. Final Status: {final_req['status_label']} (Funds Released: {final_req['funds_released']})")


if __name__ == "__main__":
    run_simulation()
