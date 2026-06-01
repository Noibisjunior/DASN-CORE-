import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# Import your working NLP engine
from nlp_engine import extract_intelligence

print("Loading historical ACLED-hybrid dataset...")

# Adjust path assuming you run this from the dasn-core root directory
df = pd.read_csv("data/simulated_reports.csv")

print("Extracting AI features from text payloads. This may take a moment...")

# Create empty lists to hold our numerical features
resource_counts = []
has_actor = []
has_location = []

# Process every row in our synthetic dataset through the NLP engine
for text in df['Raw_Text_Payload']:
    extracted = extract_intelligence(text)
    
    # Convert the JSON lists into numbers!
    resource_counts.append(len(extracted['resources']))
    has_actor.append(1 if len(extracted['actors']) > 0 else 0)
    has_location.append(1 if len(extracted['locations']) > 0 else 0)

# Add these new numerical columns back into our dataframe
df['Resource_Count'] = resource_counts
df['Has_Actor'] = has_actor
df['Has_Location'] = has_location

# Define our Features (X) and our Target Answer (y)
X = df[['Resource_Count', 'Has_Actor', 'Has_Location']]
y = df['True_Threat_Label']

# Split the data: 80% for training, 20% for testing the AI's accuracy
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training the Random Forest Classifier...")
# Initialize the Random Forest with 100 decision trees (K=100 from your mathematical model)
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)

# Test the model to see how smart it is
predictions = rf_model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

print(f"\n--- Model Training Complete ---")
print(f"AI Accuracy Score: {accuracy * 100:.2f}%\n")
print("Detailed Classification Report:")
print(classification_report(y_test, predictions))

# Save the trained model to a file so the FastAPI server can use it
model_path = "app/ai_models/threat_model.pkl"
joblib.dump(rf_model, model_path)
print(f"Model successfully saved to {model_path}!")