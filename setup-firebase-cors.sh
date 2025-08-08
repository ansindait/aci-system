#!/bin/bash

# Script to set up CORS configuration for Firebase Storage
# This allows cross-origin requests for images in the PDF export

echo "Setting up Firebase Storage CORS configuration..."

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "Error: gsutil is not installed. Please install Google Cloud SDK first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if firebase project is set
if [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "Error: FIREBASE_PROJECT_ID environment variable is not set."
    echo "Please set it to your Firebase project ID:"
    echo "export FIREBASE_PROJECT_ID=your-project-id"
    exit 1
fi

# Set CORS configuration
echo "Setting CORS configuration for Firebase Storage bucket..."
gsutil cors set firebase-storage-cors.json gs://$FIREBASE_PROJECT_ID.appspot.com

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration set successfully!"
    echo "Firebase Storage should now allow cross-origin requests for images."
else
    echo "❌ Failed to set CORS configuration."
    echo "Please check your Firebase project ID and permissions."
fi 