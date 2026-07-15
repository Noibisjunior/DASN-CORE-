# DASN-CORE-
How to train the Random forest model
Load Data – We use the built-in Iris dataset for simplicity.
Split Data – train_test_split ensures we have separate training and testing sets.
Create Model – RandomForestClassifier builds multiple decision trees and averages their predictions.
Train – .fit() learns patterns from the training data.
Predict – .predict() makes predictions on unseen data.
Evaluate – We check accuracy and get a detailed classification report.
Predict New Data – You can pass new feature values to get predictions.