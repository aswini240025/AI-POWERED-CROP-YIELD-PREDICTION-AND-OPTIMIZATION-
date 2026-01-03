import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# 1. Load dataset
df = pd.read_csv('crop_data.csv')
print("Dataset loaded. Shape:", df.shape)
print("\nFirst 5 rows:")
print(df.head())

# 2. Split features and target
X = df.drop('label', axis=1)
y = df['label']

# 3. Split train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Train Random Forest model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 5. Evaluate
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\nModel Accuracy: {accuracy:.2%}")

# 6. Save model
joblib.dump(model, 'crop_recommender.pkl')
print("Model saved as 'crop_recommender.pkl'")

# 7. Example prediction
example = [[90, 42, 43, 20.87, 82, 6.5, 203]]  # Sample input
predicted_crop = model.predict(example)[0]
print(f"\nExample prediction for N=90,P=42,K=43,temp=20.87,hum=82,pH=6.5,rain=203 → {predicted_crop}")