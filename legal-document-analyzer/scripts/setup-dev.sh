#!/bin/bash

# Legal Document Analyzer Development Setup Script
# This script sets up the development environment

set -e

echo "🛠️  Setting up Legal Document Analyzer development environment..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies for AI service
echo "🐍 Installing Python dependencies for AI service..."
cd ai-service
pip install -r requirements.txt
cd ..

# Download required AI models
echo "🤖 Setting up AI models..."
cd ai-service
python -c "
from sentence_transformers import SentenceTransformer
print('Downloading embedding model...')
model = SentenceTransformer('all-MiniLM-L6-v2')
print('Embedding model ready!')
"
cd ..

# Build CDS models
echo "🏗️  Building CDS models..."
npx cds build

# Create local SQLite database for development
echo "💾 Setting up local database..."
npx cds deploy --to sqlite

echo "✅ Development environment setup completed!"
echo ""
echo "🚀 To start the development servers:"
echo "1. Backend: npm run watch"
echo "2. AI Service: cd ai-service && python app.py"
echo "3. Frontend: Open http://localhost:4004 in your browser"
echo ""
echo "📚 Useful commands:"
echo "- npm run watch: Start CAP development server with hot reload"
echo "- npm run build: Build the application for production"
echo "- npm run deploy: Deploy database changes"
echo "- npm test: Run tests"
echo ""
echo "🔧 Configuration:"
echo "- Edit package.json for CAP configuration"
echo "- Edit ai-service/app.py for AI service settings"
echo "- Edit app/legal-document-ui/manifest.json for UI5 settings"
