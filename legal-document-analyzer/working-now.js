const express = require('express');
const path = require('path');

const app = express();
const PORT = 3333;

console.log('🚀 Starting Legal Document Analyzer Server...');

// Serve static files from UI directory
app.use(express.static(path.join(__dirname, 'app/legal-document-ui')));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/legal-document-ui/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('✅ Server started successfully!');
    console.log(`🌐 Open: http://localhost:${PORT}`);
    console.log('📱 Your Legal Document Analyzer is ready!');
});
