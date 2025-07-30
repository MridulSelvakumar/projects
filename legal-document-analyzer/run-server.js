const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

console.log('🚀 Starting Legal Document Analyzer...');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the UI directory
app.use(express.static(path.join(__dirname, 'app/legal-document-ui')));

// Main routes
app.get('/', (req, res) => {
    console.log('📱 Root request - redirecting to UI');
    res.redirect('/index.html');
});

app.get('/legal-document-ui/', (req, res) => {
    console.log('📱 UI request - serving index.html');
    res.redirect('/index.html');
});

// Check if index.html exists
const indexPath = path.join(__dirname, 'app/legal-document-ui/index.html');
if (!fs.existsSync(indexPath)) {
    console.log('⚠️ index.html not found, checking for working.html');
    const workingPath = path.join(__dirname, 'app/legal-document-ui/working.html');
    if (fs.existsSync(workingPath)) {
        app.get('/index.html', (req, res) => {
            res.sendFile(workingPath);
        });
        console.log('✅ Using working.html as fallback');
    }
} else {
    console.log('✅ Found index.html');
}

// Mock API endpoints for testing
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/legal-documents/', (req, res) => {
    res.json({
        "@odata.context": "$metadata",
        "value": [
            { name: "Documents", url: "Documents" },
            { name: "DocumentQueries", url: "DocumentQueries" }
        ]
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('🎉 Legal Document Analyzer Server Started Successfully!');
    console.log(`🌐 Application URL: http://localhost:${PORT}`);
    console.log(`📱 Direct Access: http://localhost:${PORT}/working.html`);
    console.log('✅ Server is ready and waiting for requests!');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

// Keep alive
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
