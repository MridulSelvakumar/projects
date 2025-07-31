const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 4004; // Standard SAP CAP port

console.log('🚀 Starting SAP CAP Legal Document Analyzer');
console.log('==========================================');

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Parse JSON bodies
app.use(express.json());

// Serve static files from the app directory
app.use('/app', express.static(path.join(__dirname, 'app')));

// Static resources for development

// Proxy API requests to the backend services
app.use('/legal-documents', createProxyMiddleware({
    target: 'http://localhost:8080',
    changeOrigin: true,
    logLevel: 'silent',
    onError: (err, req, res) => {
        console.log('⚠️ Backend service not available, using mock data');
        res.status(200).json({ value: [], '@odata.context': '$metadata' });
    }
}));

app.use('/user', createProxyMiddleware({
    target: 'http://localhost:8080',
    changeOrigin: true,
    logLevel: 'silent',
    onError: (err, req, res) => {
        console.log('⚠️ User service not available');
        res.status(200).json({ success: false, message: 'Service unavailable' });
    }
}));

// CAP-style service index
app.get('/', (req, res) => {
    res.json({
        "@odata.context": "$metadata",
        "value": [
            {
                "name": "LegalDocumentService",
                "kind": "EntityContainer",
                "url": "legal-documents/"
            },
            {
                "name": "UserService", 
                "kind": "EntityContainer",
                "url": "user/"
            }
        ]
    });
});

// Main application route
app.get('/', (req, res) => {
    res.json({
        message: 'Legal Document Analyzer API',
        services: [
            '/legal-documents/',
            '/user/',
            '/health'
        ]
    });
});

// CAP-style metadata endpoint
app.get('/$metadata', (req, res) => {
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="LegalDocumentService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="Documents" EntityType="LegalDocumentService.Documents"/>
        <EntitySet Name="DocumentQueries" EntityType="LegalDocumentService.DocumentQueries"/>
      </EntityContainer>
      <EntityType Name="Documents">
        <Key>
          <PropertyRef Name="ID"/>
        </Key>
        <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
        <Property Name="title" Type="Edm.String"/>
        <Property Name="fileName" Type="Edm.String"/>
        <Property Name="documentType" Type="Edm.String"/>
        <Property Name="status" Type="Edm.String"/>
        <Property Name="summary" Type="Edm.String"/>
        <Property Name="createdAt" Type="Edm.DateTimeOffset"/>
      </EntityType>
      <EntityType Name="DocumentQueries">
        <Key>
          <PropertyRef Name="ID"/>
        </Key>
        <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
        <Property Name="query" Type="Edm.String"/>
        <Property Name="response" Type="Edm.String"/>
        <Property Name="confidence" Type="Edm.Decimal"/>
      </EntityType>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'SAP CAP Legal Document Analyzer',
        port: PORT,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('✅ SAP CAP Server Started Successfully!');
    console.log('');
    console.log('🎯 Access Points:');
    console.log(`   📡 CAP Service Index: http://localhost:${PORT}/`);
    console.log(`   📄 OData Metadata: http://localhost:${PORT}/$metadata`);
    console.log(`   🌐 API Root: http://localhost:${PORT}/`);
    console.log(`   🔍 Health Check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('🎨 Available Services:');
    console.log(`   📋 Legal Documents: http://localhost:${PORT}/legal-documents/`);
    console.log(`   👤 User Service: http://localhost:${PORT}/user/`);
    console.log('');
    console.log('🔗 Backend Services:');
    console.log('   📡 Main Backend: http://localhost:8080 (proxied)');
    console.log('   🤖 AI Service: http://localhost:5002');
    console.log('');
    console.log('🎉 Ready for SAP CAP development!');
});

module.exports = app;
