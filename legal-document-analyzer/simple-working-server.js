const express = require('express');
const path = require('path');

const app = express();
const PORT = 4004;

console.log('🚀 Starting Legal Document Analyzer Server...');

// Serve static files from the UI directory
app.use(express.static(path.join(__dirname, 'app/legal-document-ui')));

// Serve the main app at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/legal-document-ui/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('✅ Legal Document Analyzer Server Started!');
    console.log(`🌐 Application: http://localhost:${PORT}`);
    console.log('📱 Your SAP Fiori app is ready!');
});
