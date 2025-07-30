const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

async function startCompleteServer() {
  try {
    console.log('🚀 Starting Complete Legal Document Analyzer Server...');
    console.log('CDS version:', cds.version);
    
    // Create Express app
    const app = express();
    
    // Serve static files from app directory
    app.use('/ui', express.static(path.join(__dirname, 'app/legal-document-ui')));
    
    // Redirect root to UI
    app.get('/', (req, res) => {
      res.redirect('/ui');
    });
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        services: {
          cap: 'running',
          ui: 'available',
          ai: 'mock-mode'
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
        ui: "/ui",
        endpoints: {
          documents: "/legal-documents/Documents",
          clauses: "/legal-documents/Clauses", 
          parties: "/legal-documents/Parties",
          queries: "/legal-documents/DocumentQueries",
          analytics: "/legal-documents/DocumentSummary"
        },
        features: [
          "Document Upload & Processing",
          "AI-Powered Clause Extraction", 
          "Semantic Search with Vector Embeddings",
          "Legal Entity Recognition",
          "Document Q&A with RAG",
          "Analytics & Insights"
        ]
      });
    });
    
    // Start CDS services
    const cdsApp = await cds.serve('all').in(app);
    
    // Start the server
    const PORT = process.env.PORT || 4004;
    const server = app.listen(PORT, () => {
      console.log('✅ Legal Document Analyzer started successfully!');
      console.log(`🌐 Server running at: http://localhost:${PORT}`);
      console.log(`🎨 Fiori UI: http://localhost:${PORT}/ui`);
      console.log(`📊 API Documentation: http://localhost:${PORT}/legal-documents`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log(`🔧 API Info: http://localhost:${PORT}/api`);
      console.log('\n🎯 Features Available:');
      console.log('   ✅ SAP CAP Backend Service');
      console.log('   ✅ SAP Fiori UI5 Frontend');
      console.log('   ✅ Document Management');
      console.log('   ✅ AI Q&A Interface');
      console.log('   ✅ Analytics Dashboard');
      console.log('   ✅ RESTful API Endpoints');
      console.log('\n🚀 Ready for enterprise legal document analysis!');
    });
    
    return server;
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Legal Document Analyzer...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Legal Document Analyzer...');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startCompleteServer();
}

module.exports = { startCompleteServer };
