const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(path.join(__dirname, 'app/legal-document-ui')));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app/legal-document-ui/restore.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 RESTORED Legal Document Analyzer Server Started!');
    console.log(`🌐 Application: http://localhost:${PORT}`);
    console.log('✅ This is the working version from your screenshot!');
});

// Keep server running
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    process.exit(0);
});
