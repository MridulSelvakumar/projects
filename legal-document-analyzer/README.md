# AI-Powered Legal Document Analyzer

An intelligent enterprise application built with SAP BTP, CAPM, HANA Cloud, and GenAI that enables users to upload legal documents, extract key clauses using AI, and ask questions in natural language.

## 🎯 Project Overview

The Legal Document Analyzer leverages modern AI technologies to transform how organizations handle legal document analysis. Users can upload contracts, NDAs, and other legal documents through a RESTful API interface, while the system automatically extracts key clauses, identifies parties, and enables natural language querying through an integrated AI service powered by LLaMA 3.

## 🏗️ Architecture

The solution employs a comprehensive microservices architecture deployed on SAP BTP Cloud Foundry, consisting of three main components working in harmony. The API layer provides RESTful endpoints for document upload and AI querying. The backend leverages SAP Cloud Application Programming Model with Node.js runtime, implementing CDS models for Documents, Clauses, Parties, and vector embeddings while orchestrating document processing and AI service integration. The AI layer features a Python microservice that integrates with LLaMA 3 via Ollama, generates embeddings using sentence transformers, and implements a Retrieval-Augmented Generation pipeline for contextually accurate responses.

## 🚀 Key Features

### Document Management
- **Multi-format Support**: Upload PDF, Word documents, and text files
- **Intelligent Processing**: Automatic text extraction and clause identification
- **Real-time Status**: Track document processing progress from upload to completion
- **Comprehensive Search**: Find documents by title, type, content, or metadata

### AI-Powered Analysis
- **Clause Extraction**: Automatically identify liability, confidentiality, termination, and payment clauses
- **Party Recognition**: Extract and categorize involved parties and their roles
- **Vector Embeddings**: Generate semantic embeddings for precise content retrieval
- **Natural Language Queries**: Ask questions in plain English about document content

### Enterprise Integration
- **SAP BTP Native**: Built specifically for SAP Business Technology Platform
- **HANA Cloud Storage**: Scalable database with vector search capabilities
- **Security**: Integrated XSUAA authentication and role-based access control
- **Monitoring**: Comprehensive logging and analytics for system performance

## 📋 Prerequisites

Before setting up the Legal Document Analyzer, ensure you have the following tools and services configured:

### Development Tools
- Node.js (version 20 or higher)
- Python 3.11 or higher
- SAP CDS Development Kit (`@sap/cds-dk`)
- Cloud Foundry CLI
- Multi-Target Application Build Tool (MBT)

### SAP BTP Services
- SAP HANA Cloud instance
- Cloud Foundry runtime
- Destination service
- Connectivity service
- XSUAA authentication service

### AI Infrastructure
- Ollama installed and configured
- LLaMA 3 model downloaded and available
- Sufficient compute resources for AI processing

## 🛠️ Installation & Setup

### Quick Start
```bash
# Clone and setup the project
git clone <repository-url>
cd legal-document-analyzer

# Run the development setup script
./scripts/setup-dev.sh

# Start the development servers
npm run watch                    # CAP backend (Terminal 1)
cd ai-service && python app.py  # AI service (Terminal 2)
```

### Manual Setup
```bash
# Install dependencies
npm install
cd ai-service && pip install -r requirements.txt && cd ..

# Build CDS models
npx cds build

# Deploy to local SQLite (development)
npx cds deploy --to sqlite

# Start services individually
npm run watch                    # Backend on http://localhost:4004
cd ai-service && python app.py  # AI service on http://localhost:5000
```

## 🚀 Deployment

### Development Environment
The application runs locally with SQLite database and mock AI services for rapid development and testing.

### Production Deployment to SAP BTP
```bash
# Build and deploy the complete application
./scripts/deploy.sh

# Or manually using MBT
mbt build
cf deploy mta_archives/legal-document-analyzer_1.0.0.mtar
```

## 📖 Usage Guide

### Document Upload Process
Users begin by accessing the API endpoints to upload documents. They can send PDF, Word documents, or text files via POST requests to the upload endpoint. The system supports documents up to 50MB and automatically detects document types including contracts, NDAs, agreements, and policies. Upon upload, documents are stored in HANA Cloud while the AI service processes them asynchronously to extract text, identify clauses, and generate vector embeddings.

### AI-Powered Querying
Once documents are processed, users can select any document and interact with the AI assistant through a chat-style interface. The system supports natural language questions such as "What is the liability clause in this contract?" or "Who are the parties involved in this agreement?" The AI service uses Retrieval-Augmented Generation to find relevant clauses and provide contextually accurate responses based only on the document content.

### Analytics and Insights
The application provides comprehensive analytics including document processing status, clause type distribution, query performance metrics, and user activity tracking. Administrators can monitor system performance, review AI response quality through user feedback, and analyze document processing trends.

## 🧪 Testing

### Unit Tests
```bash
npm test                    # Run CAP service tests
cd ai-service && python -m pytest  # Run AI service tests
```

### Integration Tests
```bash
npm run test:integration   # End-to-end API tests
```

### Manual Testing Scenarios
1. **Document Upload**: Test various file formats and sizes
2. **AI Processing**: Verify clause extraction and embedding generation
3. **Query Interface**: Test natural language question processing
4. **Error Handling**: Validate system behavior with invalid inputs

## 📁 Project Structure

```
legal-document-analyzer/
├── api/                       # RESTful API endpoints
├── srv/                       # CAP backend services and logic
├── db/                        # CDS data models and HANA artifacts
├── ai-service/               # Python AI microservice
├── scripts/                  # Deployment and setup scripts
├── mta.yaml                  # Multi-target application descriptor
├── manifest.yml              # Cloud Foundry deployment manifest
└── package.json              # Node.js dependencies and scripts
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: Application environment (development/production)
- `CDS_FEATURES_FETCH_CSRF`: Enable CSRF protection
- `FLASK_ENV`: Python service environment
- `OLLAMA_HOST`: Ollama service endpoint

### Service Configuration
Edit `package.json` for CAP configuration and `ai-service/app.py` for AI service settings.

## 🤝 Contributing

We welcome contributions to improve the Legal Document Analyzer. Please follow the established coding standards, write comprehensive tests for new features, update documentation for any changes, and submit pull requests with clear descriptions.

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🆘 Support

For technical support, please check the troubleshooting section in our documentation, review application logs using `cf logs <app-name>`, or contact the development team through the established support channels.

## 🔮 Roadmap

Future enhancements include support for additional document formats, advanced AI models for improved accuracy, integration with external legal databases, mobile application development, and enhanced analytics and reporting capabilities.