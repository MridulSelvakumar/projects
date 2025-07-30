const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4004;

// Middleware
app.use(express.json());
app.use(express.static('app/legal-document-ui'));

// Serve the UI
app.get('/', (req, res) => {
    res.redirect('/legal-document-ui/');
});

app.get('/legal-document-ui/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/legal-document-ui/index.html'));
});

// Mock API endpoints for testing
app.get('/legal-documents/', (req, res) => {
    res.json({
        "@odata.context": "$metadata",
        "value": [
            {
                "name": "Documents",
                "url": "Documents"
            },
            {
                "name": "DocumentQueries", 
                "url": "DocumentQueries"
            }
        ]
    });
});

app.get('/legal-documents/Documents', (req, res) => {
    res.json({
        "@odata.context": "$metadata#Documents",
        "value": [
            {
                "ID": "1",
                "title": "Sample Contract",
                "fileName": "sample-contract.pdf",
                "documentType": "CONTRACT",
                "status": "PROCESSED",
                "createdAt": new Date().toISOString()
            }
        ]
    });
});

app.post('/legal-documents/Documents/uploadDocument', (req, res) => {
    console.log('📤 Upload request received:', req.body);
    res.json({
        "ID": "doc-" + Date.now(),
        "success": true,
        "message": "Document uploaded successfully"
    });
});

app.post('/legal-documents/DocumentQueries/askQuestion', (req, res) => {
    console.log('💬 Q&A request received:', req.body);
    const { question } = req.body;
    
    res.json({
        "ID": "query-" + Date.now(),
        "response": `This is a mock AI response to your question: "${question}". The AI service would analyze your legal documents and provide detailed insights here.`,
        "confidence": 0.85,
        "method": "MOCK"
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Legal Document Analyzer Quick Server Started!');
    console.log(`🌐 Application: http://localhost:${PORT}`);
    console.log(`📱 UI: http://localhost:${PORT}/legal-document-ui/`);
    console.log(`📊 API: http://localhost:${PORT}/legal-documents/`);
    console.log('✅ Server is ready for testing!');
});
