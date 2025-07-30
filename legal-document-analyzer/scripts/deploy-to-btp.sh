#!/bin/bash

# SAP BTP Deployment Script for Legal Document Analyzer
# This script deploys the complete application to SAP Business Technology Platform

set -e

echo "🚀 Starting SAP BTP Deployment for Legal Document Analyzer"
echo "============================================================"

# Configuration
ORG=${BTP_ORG:-"your-org"}
SPACE=${BTP_SPACE:-"dev"}
API_ENDPOINT=${BTP_API_ENDPOINT:-"https://api.cf.sap.hana.ondemand.com"}
MTA_FILE="legal-document-analyzer_1.0.0.mtar"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if CF CLI is installed
    if ! command -v cf &> /dev/null; then
        log_error "Cloud Foundry CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if MBT is installed
    if ! command -v mbt &> /dev/null; then
        log_error "MBT (Multi-Target Application Build Tool) is not installed."
        log_info "Install it with: npm install -g mbt"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

# Login to Cloud Foundry
cf_login() {
    log_info "Logging into Cloud Foundry..."
    
    if [ -z "$CF_USERNAME" ] || [ -z "$CF_PASSWORD" ]; then
        log_warning "CF_USERNAME or CF_PASSWORD not set. Using interactive login."
        cf login -a "$API_ENDPOINT" -o "$ORG" -s "$SPACE"
    else
        cf login -a "$API_ENDPOINT" -o "$ORG" -s "$SPACE" -u "$CF_USERNAME" -p "$CF_PASSWORD"
    fi
    
    log_success "Logged into Cloud Foundry"
}

# Build the application
build_application() {
    log_info "Building the application..."
    
    # Clean previous builds
    rm -rf gen/
    rm -f *.mtar
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Build CAP application
    log_info "Building CAP application..."
    npx cds build --production
    
    # Build MTA
    log_info "Building MTA archive..."
    mbt build
    
    if [ ! -f "$MTA_FILE" ]; then
        log_error "MTA build failed. File $MTA_FILE not found."
        exit 1
    fi
    
    log_success "Application built successfully"
}

# Deploy services
deploy_services() {
    log_info "Creating/updating services..."
    
    # HANA Cloud service
    log_info "Creating HANA Cloud service..."
    cf create-service hana hdi-shared legal-document-analyzer-hana || log_warning "HANA service already exists"
    
    # Destination service
    log_info "Creating Destination service..."
    cf create-service destination lite legal-document-analyzer-destination || log_warning "Destination service already exists"
    
    # Connectivity service
    log_info "Creating Connectivity service..."
    cf create-service connectivity lite legal-document-analyzer-connectivity || log_warning "Connectivity service already exists"
    
    # XSUAA service
    log_info "Creating XSUAA service..."
    cf create-service xsuaa application legal-document-analyzer-xsuaa -c xs-security.json || log_warning "XSUAA service already exists"
    
    # Application Logs service
    log_info "Creating Application Logs service..."
    cf create-service application-logs lite legal-document-analyzer-logging || log_warning "Logging service already exists"
    
    log_success "Services created/updated"
}

# Deploy the application
deploy_application() {
    log_info "Deploying application to SAP BTP..."
    
    # Deploy using MTA
    cf deploy "$MTA_FILE" --retries 3
    
    log_success "Application deployed successfully"
}

# Show deployment information
show_deployment_info() {
    log_info "Deployment Information:"
    echo "======================="
    
    # Get application URLs
    BACKEND_URL=$(cf app legal-document-analyzer-srv --guid | xargs -I {} cf curl /v2/apps/{}/routes | jq -r '.resources[0].entity.host + "." + .resources[0].entity.domain.entity.name')
    AI_URL=$(cf app legal-document-analyzer-ai --guid | xargs -I {} cf curl /v2/apps/{}/routes | jq -r '.resources[0].entity.host + "." + .resources[0].entity.domain.entity.name')
    UI_URL=$(cf app legal-document-analyzer-ui --guid | xargs -I {} cf curl /v2/apps/{}/routes | jq -r '.resources[0].entity.host + "." + .resources[0].entity.domain.entity.name')
    
    echo "🌐 Application URLs:"
    echo "   Backend Service: https://$BACKEND_URL"
    echo "   AI Service:      https://$AI_URL"
    echo "   Frontend UI:     https://$UI_URL"
    echo ""
    echo "📊 Service Status:"
    cf services | grep legal-document-analyzer
    echo ""
    echo "🚀 Application Status:"
    cf apps | grep legal-document-analyzer
}

# Main deployment process
main() {
    log_info "Legal Document Analyzer - SAP BTP Deployment"
    
    check_prerequisites
    cf_login
    build_application
    deploy_services
    deploy_application
    show_deployment_info
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Your Legal Document Analyzer is now running on SAP BTP"
}

# Run main function
main "$@"
