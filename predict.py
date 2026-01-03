import joblib
import sys
import numpy as np

# Load the trained model
model = joblib.load('crop_recommender.pkl')

# Get features from command line arguments
if len(sys.argv) == 8:  # Expecting 7 features + script name
    features = [float(arg) for arg in sys.argv[1:8]]
    prediction = model.predict([features])[0]
    print(prediction)
else:
    print("Error: Expected 7 feature values (N P K temperature humidity ph rainfall)", file=sys.stderr)
    sys.exit(1)