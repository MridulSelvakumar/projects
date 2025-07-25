#!/bin/bash

# Legal Document Analyzer Deployment Script
# This script deploys the entire application to SAP BTP Cloud Foundry

set -e

echo "🚀 Starting deployment of Legal Document Analyzer..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v cf &> /dev/null; then
    echo "❌ Cloud Foundry CLI not found. Please install it first."
    exit 1
fi

if ! command -v mbt &> /dev/null; then
    echo "❌ MBT (Multi-Target Application Build Tool) not found. Please install it first."
    exit 1
fi

# Login check
if ! cf target &> /dev/null; then
    echo "❌ Not logged in to Cloud Foundry. Please run 'cf login' first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build the application
echo "🔨 Building the application..."
npm install
mbt build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Cloud Foundry
echo "🚀 Deploying to Cloud Foundry..."
cf deploy mta_archives/legal-document-analyzer_1.0.0.mtar

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Deployment completed successfully"

# Get application URLs
echo "📋 Application URLs:"
echo "Backend Service: $(cf app legal-document-analyzer-srv --guid | xargs -I {} cf curl /v2/apps/{}/routes | jq -r '.resources[0].entity.host').cfapps.sap.hana.ondemand.com"
echo "AI Service: $(cf app legal-document-analyzer-ai --guid | xargs -I {} cf curl /v2/apps/{}/routes | jq -r '.resources[0].entity.host').cfapps.sap.hana.ondemand.com"
echo "Frontend: $(cf app legal-document-analyzer-ui --guid | xargs -I {} cf curl /v2/apps/{}/routes | jq -r '.resources[0].entity.host').cfapps.sap.hana.ondemand.com"

echo "🎉 Legal Document Analyzer deployed successfully!"
echo "📖 Check the application logs with: cf logs <app-name>"
echo "🔍 Monitor applications with: cf apps"
