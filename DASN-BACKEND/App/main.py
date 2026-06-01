from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
from datetime import datetime
import joblib
import os

# Import your NLP engine
from ai_models.nlp_engine import extract_intelligence
from blockchain.ledger import DASNBlockchain
from database.graph_engine import DASNGraphDB

app = FastAPI(title="DASN Core API", version="4.0 - Full Stack")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 1. Load the Machine Learning Model at startup!
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "ai_models", "threat_model.pkl")
if os.path.exists(MODEL_PATH):
    print("Loading Random Forest Threat Model...")
    classifier = joblib.load(MODEL_PATH)
else:
    print("WARNING: threat_model.pkl not found. Run train_classifier.py first!")
    classifier = None

# 2. Initialize the Blockchain Ledger
dasn_ledger = DASNBlockchain()

# 3. Initialize Neo4j Graph DB Connection
graph_db = DASNGraphDB("bolt://localhost:7687", "neo4j", "password123")

class IntelligenceReport(BaseModel):
    phone_number: str
    raw_text: str
    interface_type: str

def hash_identity(msisdn: str) -> str:
    secret_salt = "DASN_NATIONAL_SEC_2026" 
    return hashlib.sha256((msisdn + secret_salt).encode()).hexdigest()

@app.post("/api/v1/report/submit")
async def receive_report(report: IntelligenceReport):
    try:
        # Step A: Cryptography
        anonymous_id = hash_identity(report.phone_number)
        timestamp = datetime.utcnow().isoformat()
        
        # Step B: AI Cognitive Extraction
        structured_data = extract_intelligence(report.raw_text)
        
        # Step C: Real-Time Threat Classification
        threat_level = "UNKNOWN"
        threat_score = 0
        
        if classifier:
            feature_vector = [[
                len(structured_data['resources']),
                1 if len(structured_data['actors']) > 0 else 0,
                1 if len(structured_data['locations']) > 0 else 0
            ]]
            
            prediction = classifier.predict(feature_vector)[0]
            if prediction == 1:
                threat_level = "CRITICAL_THREAT"
                threat_score = 90 + (len(structured_data['resources']) * 2)
            else:
                threat_level = "CIVILIAN_NOISE"
                threat_score = 10
                
        # Step D: Blockchain Anchoring 
        # We only anchor the sanitized data to protect the informant
        block_receipt = dasn_ledger.anchor_intelligence(
            anonymous_id=anonymous_id,
            threat_level=threat_level,
            timestamp=timestamp
        )
        
        # E: Graph Database Mapping. ONLY if it's a real threat

        if threat_level == "CRITICAL_THREAT":
            graph_db.map_intelligence(anonymous_id, structured_data)

        return {
            "status": "success",
            "message": "Intelligence processed, classified, and anchored to Blockchain and Mapped.",
            "data": {
                "anonymous_hash": anonymous_id,
                "interface": report.interface_type,
                "raw_text": report.raw_text,
                "ai_extraction": structured_data,
                "analysis": {
                    "threat_assessment": threat_level,
                    "threat_score": threat_score
                },
                "blockchain_receipt": block_receipt # The proof of immutability!
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# endpoint to view the whole blockchain
@app.get("/api/v1/ledger/view")
async def view_ledger():
    return {
        "chain": dasn_ledger.chain,
        "length": len(dasn_ledger.chain)
    }

@app.get("/api/v1/graph/view")
async def view_graph():
    try:
        # Fetch the nodes and links from Neo4j
        data = graph_db.get_graph_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))