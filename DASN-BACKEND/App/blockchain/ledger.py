from web3 import Web3 
import json
import os

class DASNBlockchain:
    def __init__(self):
        # 1. Connect Python directly to your Hardhat Ethereum Node
        self.w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
        
        if not self.w3.is_connected():
            print("WARNING: Could not connect to local Ethereum node.")
            
        # 2. Your Deployed Contract Address
        self.contract_address = self.w3.to_checksum_address("0x5fbdb2315678afecb367f032d93f642f64180aa3")
        
        # 3. The Contract ABI (Compiled from your Solidity code)
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
        
        # 5. Use the first Hardhat account as the Admin/Command Center Wallet
        if self.w3.is_connected():
            self.admin_wallet = self.w3.eth.accounts[0]

        # 6. OFF-CHAIN PERSISTENCE SETUP
        self.db_file = "dasn_offchain_db.json"
        self.ui_cache = []
        self.reputation_cache = {}
        
        # Load past data immediately when the server boots up!
        self.load_state()

    # ==========================================
    # NEW: OFF-CHAIN DATABASE METHODS
    # ==========================================
    def load_state(self):
        """Loads the reports from the hard drive if the server restarted."""
        if os.path.exists(self.db_file):
            with open(self.db_file, 'r') as f:
                data = json.load(f)
                self.ui_cache = data.get('ui_cache', [])
                self.reputation_cache = data.get('reputation_cache', {})
        else:
            # Genesis Block if the file doesn't exist yet
            self.ui_cache.append({'index': 1, 'payload': {'message': 'Ethereum Genesis Connected'}})
            self.save_state()

    def save_state(self):
        """Saves the current reports and scores to the hard drive."""
        with open(self.db_file, 'w') as f:
            json.dump({
                'ui_cache': self.ui_cache,
                'reputation_cache': self.reputation_cache
            }, f, indent=4)
    # ==========================================

    def anchor_intelligence(self, anonymous_id: str, threat_level: str, timestamp: str, raw_text: str = "", media_url: str = "", latitude: float = None, longitude: float = None):
        tx_receipt = "Ethereum Offline"
        historical_score = 0 
        
        if self.w3.is_connected():
            try:
                historical_score = self.contract.functions.getReputationScore(anonymous_id).call()
                tx_hash = self.contract.functions.anchorIntelligence(anonymous_id, threat_level, timestamp).transact({'from': self.admin_wallet})
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
                tx_receipt = receipt.transactionHash.hex()
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
        
        # CRITICAL: Save to hard drive right after adding the new report!
        self.save_state()
        
        return payload
    
    def execute_reputation_contract(self, anonymous_id: str, is_valid: bool):
        """
        Triggers the Ethereum Reputable Score system.
        """
        new_score = 0
        if self.w3.is_connected():
            try:
                # 1. Send Validation Transaction to Ethereum
                tx_hash = self.contract.functions.validateReport(
                    anonymous_id, is_valid
                ).transact({'from': self.admin_wallet})
                
                self.w3.eth.wait_for_transaction_receipt(tx_hash)
                
                # 2. Read the new Score from Ethereum
                new_score = self.contract.functions.getReputationScore(anonymous_id).call()
                self.reputation_cache[anonymous_id] = new_score
                
                # CRITICAL: Save the updated score to hard drive!
                self.save_state()
            except Exception as e:
                print(f"Smart Contract Error: {e}")
                
        return new_score