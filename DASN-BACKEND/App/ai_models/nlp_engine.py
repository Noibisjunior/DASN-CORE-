import spacy
from spacy.matcher import PhraseMatcher

print("Loading spaCy NLP Model (en_core_web_sm)...")
nlp = spacy.load("en_core_web_sm")

matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

# 1. Logistical & Tactical Patterns
logistical_resources = [
    "fuel", "rice", "bread", "weapons", "ammunition", 
    "motorcycles", "trucks", "medical kits", "solar panels", "starlink",
    "rpg", "drones", "checkpoint", "ied", "explosives", "rifles", "walkie talkie"
]
patterns_res = [nlp.make_doc(text) for text in logistical_resources]
matcher.add("LOGISTICS_RESOURCE", patterns_res)

# 2. Local Gazetteer (Northern Nigerian Hotspots & Conflict Zones)
local_locations = [
    "birnin gwari", "zamfara", "kaduna", "katsina", "sokoto", 
    "maradun", "anka", "shinkafi", "forest", "maiduguri", "borno",
    "sambisa", "chibok", "bama", "damaturu", "yobe", "lake chad"
]
patterns_loc = [nlp.make_doc(text) for text in local_locations]
matcher.add("LOCAL_LOCATION", patterns_loc)

def extract_intelligence(raw_text: str) -> dict:
    doc = nlp(raw_text)
    
    extracted_data = {
        "locations": [],
        "actors": [],
        "resources": []
    }
    
    # Step A: Standard NER extraction
    for ent in doc.ents:
        if ent.label_ in ["GPE", "LOC", "FAC"]:  
            extracted_data["locations"].append(ent.text)
        elif ent.label_ in ["ORG", "PERSON"]:
            extracted_data["actors"].append(ent.text)
            
    # Step B: Custom Matcher (This is where we fix the bug)
    matches = matcher(doc)
    for match_id, start, end in matches:
        string_id = nlp.vocab.strings[match_id]
        span = doc[start:end]
        
        if string_id == "LOGISTICS_RESOURCE":
            if span.text.lower() not in [res.lower() for res in extracted_data["resources"]]:
                extracted_data["resources"].append(span.text.lower())
                
        elif string_id == "LOCAL_LOCATION":
            loc_text = span.text.title() # Capitalize it nicely
            
            # Add to locations if it's not already there
            if loc_text not in extracted_data["locations"]:
                extracted_data["locations"].append(loc_text)
            
            # CRITICAL CORRECTION: If standard NER mistakenly thought this location was an actor, remove it!
            if loc_text in extracted_data["actors"]:
                extracted_data["actors"].remove(loc_text)
                
    # Step C: Fallback Heuristics for Actors
    if not extracted_data["actors"]:
        text_lower = raw_text.lower()
        if any(word in text_lower for word in ["men", "group", "militia", "bandits"]):
            extracted_data["actors"].append("Unidentified Armed Group")
            
    return extracted_data