from web3 import Web3
import json
import os
from dotenv import load_dotenv

# Ensure environment variables are parsed cleanly
load_dotenv()

class DASNBlockchain:
    def __init__(self):
        # 1. Connect Python directly to the Alchemy Sepolia Node
        rpc_url = os.getenv("ALCHEMY_SEPOLIA_URL")
        if not rpc_url:
            print("CRITICAL: ALCHEMY_SEPOLIA_URL environment variable is missing!")
            
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not self.w3.is_connected():
            print("WARNING: Could not connect to the remote Ethereum Sepolia node.")
        else:
            print("SUCCESS: Connected cleanly to Ethereum Sepolia via Alchemy.")
            
        # 2. Deployed Contract Address
        self.contract_address = self.w3.to_checksum_address("0x063c8b55e5a644457713e13d871fee2474aab663")
        
        # 3. The Contract ABI (Compiled from Solidity code)
        self.abi = [
            {
                "inputs": [
                    {"internalType": "string", "name": "_anonymousId", "type": "string"},
                    {"internalType": "string", "name": "_threatLevel", "type": "string"},
                    {"internalType": "string", "name": "_timestamp", "type": "string"}
                ],
                "name": "anchorIntelligence",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "string", "name": "_anonymousId", "type": "string"},
                    {"internalType": "bool", "name": "_isValid", "type": "bool"}
                ],
                "name": "validateReport",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "_anonymousId", "type": "string"}],
                "name": "getReputationScore",
                "outputs": [{"internalType": "int256", "name": "", "type": "int256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        # 4. Initialize the Contract Interface
        self.contract = self.w3.eth.contract(address=self.contract_address, abi=self.abi)
        
        # 5. Extract Private Key and derive the Public Account Address for Cloud Signing
        self.private_key = os.getenv("DEPLOYER_PRIVATE_KEY")
        if self.private_key:
            # Safely handle keys with or without the '0x' prefix
            if not self.private_key.startswith("0x"):
                self.private_key = "0x" + self.private_key
            self.admin_wallet = self.w3.eth.account.from_key(self.private_key).address
            print(f"Loaded Account Signer: {self.admin_wallet}")
        else:
            print("WARNING: DEPLOYER_PRIVATE_KEY not configured. Write operations will fail.")
            self.admin_wallet = None

        # 6. OFF-CHAIN PERSISTENCE SETUP
        self.db_file = "dasn_offchain_db.json"
        self.ui_cache = []
        self.reputation_cache = {}
        
        self.load_state()

    def load_state(self):
        """Loads the reports from the hard drive if the server restarted."""
        if os.path.exists(self.db_file):
            with open(self.db_file, 'r') as f:
                data = json.load(f)
                self.ui_cache = data.get('ui_cache', [])
                self.reputation_cache = data.get('reputation_cache', {})
        else:
            self.ui_cache.append({'index': 1, 'payload': {'message': 'Ethereum Genesis Connected'}})
            self.save_state()

    def save_state(self):
        """Saves the current reports and scores to the hard drive."""
        with open(self.db_file, 'w') as f:
            json.dump({
                'ui_cache': self.ui_cache,
                'reputation_cache': self.reputation_cache
            }, f, indent=4)

    def anchor_intelligence(self, anonymous_id: str, threat_level: str, timestamp: str, raw_text: str = "", media_url: str = "", latitude: float = None, longitude: float = None):
        tx_receipt = "Ethereum Offline"
        historical_score = 0 
        
        if self.w3.is_connected() and self.private_key:
            try:
                # Read-only call works perfectly without gas or keys
                historical_score = self.contract.functions.getReputationScore(anonymous_id).call()
                
                # Build transaction dictionary for public cloud execution
                nonce = self.w3.eth.get_transaction_count(self.admin_wallet)
                built_tx = self.contract.functions.anchorIntelligence(
                    anonymous_id, threat_level, timestamp
                ).build_transaction({
                    'chainId': 11155111,  # Sepolia Chain ID
                    'gas': 200000,
                    'maxFeePerGas': self.w3.to_wei('50', 'gwei'),
                    'maxPriorityFeePerGas': self.w3.to_wei('2', 'gwei'),
                    'nonce': nonce,
                    'from': self.admin_wallet
                })
                
                # Sign transaction locally using your private key
                signed_tx = self.w3.eth.account.sign_transaction(built_tx, private_key=self.private_key)
                
                # Send raw signed transaction payload to Alchemy
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                # OPTIMIZATION: Do not wait for the receipt (which blocks for 15-30s)!
                # Just return the pending transaction hash instantly.
                tx_receipt = tx_hash.hex()
                
            except Exception as e:
                print(f"Ethereum Revert/Error: {e}")

        payload = {
            "anonymous_id": anonymous_id,
            "threat_level": threat_level,
            "timestamp": timestamp,
            "raw_text": raw_text,
            "media_url": media_url,
            "latitude": latitude,
            "longitude": longitude,
            "eth_tx_hash": tx_receipt,
            "historical_score": historical_score, 
            "status": "PENDING" 
        }
        self.ui_cache.append({'index': len(self.ui_cache) + 1, 'payload': payload})
        self.save_state()
        
        return payload
    
    def execute_reputation_contract(self, anonymous_id: str, is_valid: bool):
        new_score = 0
        if self.w3.is_connected() and self.private_key:
            try:
                nonce = self.w3.eth.get_transaction_count(self.admin_wallet)
                built_tx = self.contract.functions.validateReport(
                    anonymous_id, is_valid
                ).build_transaction({
                    'chainId': 11155111,
                    'gas': 150000,
                    'maxFeePerGas': self.w3.to_wei('50', 'gwei'),
                    'maxPriorityFeePerGas': self.w3.to_wei('2', 'gwei'),
                    'nonce': nonce,
                    'from': self.admin_wallet
                })
                
                signed_tx = self.w3.eth.account.sign_transaction(built_tx, private_key=self.private_key)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                # OPTIMIZATION: Do not wait for the receipt to speed up verification.
                # The score will be eventually consistent on the blockchain.
                 
                new_score = self.contract.functions.getReputationScore(anonymous_id).call()
                # If we want immediate UI feedback, we could manually adjust the cached score here.
                if is_valid:
                    new_score += 1
                else:
                    new_score -= 1
                    
                self.reputation_cache[anonymous_id] = new_score
                self.save_state()
            except Exception as e:
                print(f"Smart Contract Error: {e}")
                
        return new_score
    