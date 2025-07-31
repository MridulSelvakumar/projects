const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

async function startServer() {
    try {
        console.log('🚀 Starting Legal Document Analyzer CAP Server');
        console.log('===============================================');
        
        // Load environment variables
        require('dotenv').config();
        
        // Create Express app
        const app = express();
        
        // Basic middleware
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        
        // CORS middleware
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
        
        // Serve static files for UI5 app
        app.use('/app', express.static(path.join(__dirname, 'app')));
        
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                services: {
                    cap: 'running',
                    database: 'sqlite',
                    ai: 'connected'
                }
            });
        });
        
        // API info endpoint
        app.get('/api', (req, res) => {
            res.json({
                name: "Legal Document Analyzer",
                version: "1.0.0",
                description: "AI-Powered Legal Document Analysis Platform",
                status: "Running",
                endpoints: {
                    documents: "/legal-documents/Documents",
                    clauses: "/legal-documents/Clauses",
                    parties: "/legal-documents/Parties",
                    queries: "/legal-documents/DocumentQueries",
                    analytics: "/legal-documents/DocumentSummary"
                }
            });
        });
        
        // Initialize database
        console.log('📊 Initializing database...');
        await cds.deploy('db/schema.cds').to('sqlite:legal-documents.db');
        console.log('✅ Database initialized');
        
        // Start CDS services
        console.log('🔧 Starting CDS services...');
        const cdsApp = await cds.serve('all').in(app);
        
        // Start server
        const PORT = process.env.PORT || 4004;
        const server = app.listen(PORT, () => {
            console.log('');
            console.log('🎉 Legal Document Analyzer Started Successfully!');
            console.log('===============================================');
            console.log('');
            console.log('🌐 Access Points:');
            console.log(`   📡 Main Application: http://localhost:${PORT}`);
            console.log(`   📱 Dashboard: http://localhost:${PORT}/app/project1/webapp/index.html`);
            console.log(`   🔍 Health Check: http://localhost:${PORT}/health`);
            console.log(`   📊 API Info: http://localhost:${PORT}/api`);
            console.log('');
            console.log('📋 OData Services:');
            console.log(`   📄 Legal Documents: http://localhost:${PORT}/legal-documents/`);
            console.log(`   👤 User Service: http://localhost:${PORT}/user/`);
            console.log(`   🔍 Service Metadata: http://localhost:${PORT}/legal-documents/$metadata`);
            console.log('');
            console.log('✅ Server is ready and waiting for requests!');
            console.log('Press Ctrl+C to stop the server');
        });
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down server...');
            server.close(() => {
                console.log('✅ Server stopped gracefully');
                process.exit(0);
            });
        });
        
        return server;
        
    } catch (error) {
        console.error('❌ Failed to start CAP server:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Start the server
startServer();
