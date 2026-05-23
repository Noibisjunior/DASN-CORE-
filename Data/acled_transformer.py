import os
import pandas as pd
import random
import uuid
from datetime import datetime, timedelta

# 1. Load the real ACLED dataset
print("Loading raw ACLED data...")
acled_path_candidates = ["data/acled_raw.csv", "Data/acled_raw.csv"]
acled_path = next((p for p in acled_path_candidates if os.path.exists(p)), None)
if not acled_path:
    print("Error: Could not find 'data/acled_raw.csv' or 'Data/acled_raw.csv'.")
    exit()
acled_df = pd.read_csv(acled_path)

def pick_column(df: pd.DataFrame, candidates: list[str]) -> str:
    # Match columns case-insensitively and tolerate header variants across ACLED exports.
    lowered = {col.lower(): col for col in df.columns}
    for candidate in candidates:
        if candidate.lower() in lowered:
            return lowered[candidate.lower()]
    raise KeyError(f"Missing expected column. Tried: {candidates}")

# 2. Filter for Relevant Banditry/Kidnapping Events
print(f"Original ACLED dataset size: {len(acled_df)} rows")
threat_events = ["Violence against civilians", "Battles", "Explosions/Remote violence"]
event_type_col = pick_column(acled_df, ["event_type", "EVENT_TYPE"])
filtered_df = acled_df[acled_df[event_type_col].isin(threat_events)].copy()

# Drop rows missing crucial location data
location_col = pick_column(acled_df, ["location", "LOCATION", "admin1", "ADMIN1", "admin2", "ADMIN2"])
lat_col = pick_column(acled_df, ["latitude", "LATITUDE", "centroid_latitude", "CENTROID_LATITUDE"])
lon_col = pick_column(acled_df, ["longitude", "LONGITUDE", "centroid_longitude", "CENTROID_LONGITUDE"])
date_col = pick_column(acled_df, ["event_date", "EVENT_DATE", "date", "DATE", "week", "WEEK"])

filtered_df = filtered_df.dropna(subset=[location_col, lat_col, lon_col, date_col])

# 3. Sample a manageable testbed (e.g., 200 real events to generate ~500 total tips)
sample_size = min(200, len(filtered_df))
testbed_df = filtered_df.sample(n=sample_size, random_state=42)
print(f"Filtered down to {sample_size} high-threat ground-truth events.")

# 4. Logistics Generation Variables
actors = ["Suspicious men", "Armed group", "Convoy of motorcycles", "Unknown militia"]
actions = ["buying bulk fuel", "stockpiling rice and bread", "moving heavy weapons", "setting up a camp"]
decoy_texts = [
    "Market prices for yam are too high today.",
    "The road to the capital is blocked by a broken down truck.",
    "Please we need the local government to fix the borehole.",
    "Fuel scarcity is getting worse in town."
]

def generate_hybrid_data(real_events_df):
    records = []
    
    for _, row in real_events_df.iterrows():
        real_location = row[location_col]
        real_lat = row[lat_col]
        real_lon = row[lon_col]
        
        # Parse the real event date to create a "pre-attack" intelligence tip
        try:
            event_date = pd.to_datetime(row[date_col])
            # The tip comes in 1 to 3 days BEFORE the actual attack recorded in ACLED
            tip_date = event_date - timedelta(days=random.randint(1, 3)) 
        except:
            tip_date = datetime.now()

        # Generate 1 to 2 actionable threats for this location
        num_threats = random.randint(1, 2)
        for _ in range(num_threats):
            interface_type = random.choices(["USSD", "WEB_APP"], weights=[0.8, 0.2])[0]
            actor = random.choice(actors)
            action = random.choice(actions)
            
            if interface_type == "USSD":
                raw_text = f"{actor} {action} near {real_location}. Looks dangerous."
                lat, lon = None, None # USSD lacks auto-GPS
            else:
                raw_text = f"I observed {actor.lower()} {action} outside {real_location}. They are armed."
                lat, lon = round(real_lat, 4), round(real_lon, 4)
                
            records.append({
                "Report_ID": str(uuid.uuid4())[:8],
                "Phone_Number": f"080{random.randint(10000000, 99999999)}",
                "Timestamp": tip_date.strftime("%Y-%m-%d"),
                "Interface_Type": interface_type,
                "Raw_Text_Payload": raw_text,
                "Auto_GPS_Lat": lat,
                "Auto_GPS_Lon": lon,
                "Ground_Truth_Location": real_location, # Keeping the ACLED link
                "True_Threat_Label": 1
            })
            
    # Inject 100 decoy (noise) reports to test the AI's filtering capability
    for _ in range(100):
        records.append({
            "Report_ID": str(uuid.uuid4())[:8],
            "Phone_Number": f"080{random.randint(10000000, 99999999)}",
            "Timestamp": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
            "Interface_Type": "USSD",
            "Raw_Text_Payload": random.choice(decoy_texts),
            "Auto_GPS_Lat": None,
            "Auto_GPS_Lon": None,
            "Ground_Truth_Location": "Unknown",
            "True_Threat_Label": 0
        })
        
    # Shuffle the dataset so threats and decoys are mixed
    final_df = pd.DataFrame(records).sample(frac=1).reset_index(drop=True)
    return final_df

# 5. Execute and Save
print("Synthesizing micro-intelligence based on ground truth...")
final_dataset = generate_hybrid_data(testbed_df)

output_path = "data/simulated_reports.csv"
final_dataset.to_csv(output_path, index=False)
print(f"Success! {len(final_dataset)} historically-anchored reports saved to {output_path}.")