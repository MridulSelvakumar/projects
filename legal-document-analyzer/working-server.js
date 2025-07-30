const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('app/legal-document-ui'));

// Serve the main UI
app.get('/', (req, res) => {
    res.redirect('/legal-document-ui/');
});

app.get('/legal-document-ui/', (req, res) => {
    const indexPath = path.join(__dirname, 'app/legal-document-ui/index.html');
    console.log('📱 Serving UI from:', indexPath);
    res.sendFile(indexPath);
});

// Mock API endpoints
app.get('/legal-documents/', (req, res) => {
    res.json({
        "@odata.context": "$metadata",
        "value": []
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Legal Document Analyzer Server Started!');
    console.log(`🌐 Application: http://localhost:${PORT}`);
    console.log(`📱 UI: http://localhost:${PORT}/legal-document-ui/`);
    console.log(`📊 API: http://localhost:${PORT}/legal-documents/`);
    console.log('✅ Server is ready for testing!');
    
    // Keep the server running
    process.on('SIGINT', () => {
        console.log('\n🛑 Server shutting down...');
        process.exit(0);
    });
});
