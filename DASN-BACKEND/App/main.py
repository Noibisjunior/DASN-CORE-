from pydantic import BaseModel
from fastapi import FastAPI, HTTPException,  Form, Request,UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional
import hashlib
from datetime import datetime
import joblib
import os
import shutil
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

# Import your NLP engine
from App.ai_models.nlp_engine import extract_intelligence
from App.blockchain.ledger import DASNBlockchain
from App.database.graph_engine import DASNGraphDB

app = FastAPI(title="DASN Core API", version="4.0 - Full Stack")
# Serve the uploads folder to the frontend
app.mount("/uploads", StaticFiles(directory="Data/uploads"), name="uploads")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

ws_manager = ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        os.getenv("FRONTEND_ORIGIN", "https://dasn-core-ro5d0kbua-noibisjuniors-projects.vercel.app"),
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
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

URI = os.getenv("NEO4J_URI")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

if not PASSWORD:
    print("WARNING: Neo4j Password not found in environment variables!")

# 3. Initialize your Database using the secure variables
graph_db = DASNGraphDB(URI, USERNAME, PASSWORD)


class IntelligenceReport(BaseModel):
    phone_number: str
    raw_text: str
    interface_type: str

def hash_identity(msisdn: str) -> str:
    secret_salt = "DASN_NATIONAL_SEC_2026" 
    return hashlib.sha256((msisdn + secret_salt).encode()).hexdigest()

# Ensure the uploads directory exists when the server starts
os.makedirs("Data/uploads", exist_ok=True)

@app.post("/api/v1/report/submit")
async def receive_report(
    phone_number: str = Form(...),
    raw_text: str = Form(...),
    interface_type: str = Form(...),
    latitude: Optional[float] = Form(None),  # NEW: Accept GPS
    longitude: Optional[float] = Form(None), # NEW: Accept GPS
    media_file: Optional[UploadFile] = File(None)
):
    try:
        anonymous_id = hash_identity(phone_number)
        timestamp = datetime.utcnow().isoformat()
        
        # Handle File Upload & Generate a Public URL for React
        media_url = ""
        if media_file:
            file_name = f"{anonymous_id}_{media_file.filename}"
            file_location = f"Data/uploads/{file_name}"
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(media_file.file, file_object)
            # This URL allows React to display the image!
            media_url = f"https://dasn-core.onrender.com/uploads/{file_name}"

        structured_data = extract_intelligence(raw_text)
        
        threat_level = "CIVILIAN_NOISE"
        if classifier:
            features = [[len(structured_data['resources']), 1 if len(structured_data['actors']) > 0 else 0, 1 if len(structured_data['locations']) > 0 else 0]]
            if classifier.predict(features)[0] == 1:
                threat_level = "CRITICAL_THREAT"
                
        # NEW: Pass all the context to the ledger!
        dasn_ledger.anchor_intelligence(
            anonymous_id, threat_level, timestamp, raw_text, media_url, latitude, longitude
        )
        
        if threat_level == "CRITICAL_THREAT":
            try:
                graph_db.map_intelligence(anonymous_id, structured_data)
            except Exception as graph_err:
                print(f"WARNING: Neo4j graph mapping failed (non-fatal): {graph_err}")
        
        # NEW: Broadcast via WebSocket
        import asyncio
        asyncio.create_task(ws_manager.broadcast({
            "event": "NEW_REPORT",
            "threat_level": threat_level,
            "anonymous_id": anonymous_id,
            "raw_text": raw_text
        }))
        
        return {"status": "success", "data": {"anonymous_hash": anonymous_id}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# endpoint to view the whole blockchain
@app.get("/api/v1/ledger/view")
async def view_ledger():
    return {
        "chain": dasn_ledger.ui_cache,           # Changed from dasn_ledger.chain
        "length": len(dasn_ledger.ui_cache),
        "reputation_state": dasn_ledger.reputation_cache
    }

@app.get("/api/v1/graph/view")
async def view_graph():
    try:
        # Fetch the nodes and links from Neo4j
        data = graph_db.get_graph_data()
        return data
    except Exception as e:
        print(f"Graph DB Error (Safe Fallback): {e}")
        # Return an empty graph instead of 500 if Neo4j is down/paused
        return {"nodes": [], "links": []}

@app.get("/api/v1/graph/patterns")
async def get_patterns():
    try:
        patterns = graph_db.discover_threat_patterns()
        return {"patterns": patterns}
    except Exception as e:
        print(f"Graph DB Pattern Error (Safe Fallback): {e}")
        return {"patterns": []}

@app.post("/api/v1/ussd", response_class=PlainTextResponse)
async def ussd_webhook(
    sessionId: str = Form(...),
    serviceCode: str = Form(...),
    phoneNumber: str = Form(...),
    text: str = Form(default=""),                # FIX: Defaults to empty string if omitted
    networkCode: Optional[str] = Form(default=None) # FIX: Catches the telecom network code
):
    """
    This endpoint intercepts live USSD traffic from Africa's Talking.
    """
    # The 'text' variable contains the user's input.
    if text == "":
        response = "CON Welcome to DASN Secure Intel.\nWhat did you observe?"
        
    else:
        try:
            # Step 1: Cryptography
            anonymous_id = hash_identity(phoneNumber)
            timestamp = datetime.utcnow().isoformat()
            
            # Step 2: AI NLP Engine
            structured_data = extract_intelligence(text)
            
            # Step 3: Threat Classifier
            threat_level = "CIVILIAN_NOISE"
            if classifier:
                features = [[
                    len(structured_data['resources']),
                    1 if len(structured_data['actors']) > 0 else 0,
                    1 if len(structured_data['locations']) > 0 else 0
                ]]
                if classifier.predict(features)[0] == 1:
                    threat_level = "CRITICAL_THREAT"
                    
            # Step 4: Blockchain Anchor
            dasn_ledger.anchor_intelligence(anonymous_id, threat_level, timestamp)
            
            # Step 5: Graph Database
            if threat_level == "CRITICAL_THREAT":
                graph_db.map_intelligence(anonymous_id, structured_data)

            # NEW: Broadcast via WebSocket
            import asyncio
            asyncio.create_task(ws_manager.broadcast({
                "event": "NEW_REPORT",
                "threat_level": threat_level,
                "anonymous_id": anonymous_id,
                "raw_text": text
            }))

            response = "END Thank you.\nYour report has been safely submitted."
            
        except Exception as e:
            print(f"USSD Error: {e}")
            response = "END System error. Please try again later."

    return response     



# Data model for the security  action
class ValidationAction(BaseModel):
    anonymous_id: str
    is_valid: bool

@app.post("/api/v1/ledger/validate")
async def validate_intelligence(action: ValidationAction):
    try:
        # Trigger Ethereum and get the new accumulated score (+10 for valid, -10 for decoy)
        new_score = dasn_ledger.execute_reputation_contract(action.anonymous_id, action.is_valid)
        
        # AGGRESSIVE CACHE UPDATE: 
        # Loop through EVERY block in the UI cache to update the score and status
        for block in dasn_ledger.ui_cache:
            if block['payload'].get('anonymous_id') == action.anonymous_id:
                # Update the score on all of their cards
                block['payload']['historical_score'] = new_score
                
                # Only change the status if it was pending
                if block['payload'].get('status') == "PENDING":
                    block['payload']['status'] = "VERIFIED" if action.is_valid else "DECOY"
                    
        # CRITICAL FIX: Save the new VERIFIED/DECOY statuses to the hard drive!
        dasn_ledger.save_state()
        
        # Broadcast real-time update via WebSockets
        import asyncio
        asyncio.create_task(ws_manager.broadcast({
            "event": "REPORT_VALIDATED",
            "anonymous_id": action.anonymous_id,
            "new_score": new_score,
            "is_valid": action.is_valid
        }))
        
        return {"status": "success", "new_score": new_score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from the client, just keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
   