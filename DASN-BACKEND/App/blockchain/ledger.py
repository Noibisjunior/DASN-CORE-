import hashlib
import json
from time import time

class DASNBlockchain:
    def __init__(self):
        self.chain = []
        # Create the Genesis Block (The very first block in the chain)
        self.create_block(previous_hash='0', proof=100, payload={"message": "DASN Genesis Block Initialized"})

    def create_block(self, proof, previous_hash, payload):
        """
        Creates a new block in the blockchain.
        """
        block = {
            'index': len(self.chain) + 1,
            'timestamp': time(),
            'payload': payload,
            'proof': proof,
            'previous_hash': previous_hash
        }
        self.chain.append(block)
        return block

    def hash_block(self, block):
        """
        Creates a SHA-256 hash of a Block.
        """
        # We must sort the dictionary keys so the hash is always consistent
        encoded_block = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(encoded_block).hexdigest()

    def anchor_intelligence(self, anonymous_id: str, threat_level: str, timestamp: str):
        """
        Takes the AI output and anchors it into a new, immutable block.
        """
        # 1. Get the hash of the previous block to maintain the chain
        previous_block = self.chain[-1]
        previous_hash = self.hash_block(previous_block)
        
        # 2. Mock a Proof-of-Work (Kept simple to ensure real-time API speeds)
        proof = len(self.chain) * 42 
        
        # 3. Create the sanitized payload (NO RAW TEXT ALLOWED)
        payload = {
            "anonymous_id": anonymous_id,
            "threat_level": threat_level,
            "timestamp": timestamp
        }
        
        # 4. Mine the block!
        new_block = self.create_block(proof, previous_hash, payload)
        return new_block
    
    #