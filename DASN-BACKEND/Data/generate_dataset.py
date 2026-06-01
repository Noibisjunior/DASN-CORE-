import pandas as pd
import random
import uuid

# 1. Define our Logistical Variables (Based on your SLR)
actors = ["Suspicious men", "Three unregistered motorcycles", "Two Hilux trucks", "Armed group", "Unknown individuals"]
actions = ["buying plenty fuel", "loading sacks of rice", "purchasing trauma medical kits", "transporting ammunition", "asking for directions to the forest"]
locations = ["near Birnin Gwari market", "heading North into the forest", "at Zamfara border crossing", "behind the village pharmacy", "on the abandoned logging road"]

# Define Decoy/Normal variables (Economic Noise)
decoy_texts = [
    "Market prices for yam are too high today.",
    "The road to Kaduna is blocked by a broken down truck.",
    "Please we need government to fix the borehole in our village.",
    "Two men were arguing loudly at the motor park.",
    "Fuel scarcity is getting worse in town."
]

def generate_synthetic_data(num_records=200):
    records = []
    for _ in range(num_records):
        # Determine Interface Type (USSD is more common in rural areas)
        interface_type = random.choices(["USSD", "WEB_APP"], weights=[0.7, 0.3])[0]
        phone_number = f"080{random.randint(10000000, 99999999)}"
        
        # Determine if this is a True Threat (1) or a Decoy/Noise (0)
        is_threat = random.choices([1, 0], weights=[0.6, 0.4])[0]
        
        if is_threat:
            # Construct a realistic threat report
            actor = random.choice(actors)
            action = random.choice(actions)
            location = random.choice(locations)
            
            if interface_type == "USSD":
                # USSD is short and lacks auto-GPS
                raw_text = f"{actor} {action} {location}. Very suspicious."
                lat, lon = None, None
            else:
                # Web App allows longer text and has GPS coordinates
                raw_text = f"I observed {actor.lower()} {action} {location}. They looked armed and were acting aggressively."
                lat = round(random.uniform(10.0, 12.0), 4) # Rough Northern Nigeria Lat
                lon = round(random.uniform(5.0, 8.0), 4)   # Rough Northern Nigeria Lon
        else:
            # Construct a decoy report
            raw_text = random.choice(decoy_texts)
            lat = round(random.uniform(10.0, 12.0), 4) if interface_type == "WEB_APP" else None
            lon = round(random.uniform(5.0, 8.0), 4) if interface_type == "WEB_APP" else None
            
        records.append({
            "Report_ID": str(uuid.uuid4())[:8],
            "Phone_Number": phone_number,
            "Interface_Type": interface_type,
            "Raw_Text_Payload": raw_text,
            "Auto_GPS_Lat": lat,
            "Auto_GPS_Lon": lon,
            "True_Threat_Label": is_threat # We need this to train the Random Forest later!
        })
        
    return pd.DataFrame(records)

if __name__ == "__main__":
    print("Initializing Synthetic Dataset Generator...")
    df = generate_synthetic_data(200) # Generate 200 reports
    
    # Save to CSV
    output_path = "data/simulated_reports.csv"
    df.to_csv(output_path, index=False)
    
    print(f"Success! {len(df)} synthetic reports generated and saved to {output_path}.")
    print("\nSample Data:")
    print(df[['Interface_Type', 'Raw_Text_Payload', 'True_Threat_Label']].head())