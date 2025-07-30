const cds = require('@sap/cds');

async function startServer() {
  try {
    console.log('Starting Legal Document Analyzer...');
    console.log('CDS version:', cds.version);
    
    // Start the CDS server
    const server = await cds.serve('all').to('http://localhost:4004');
    
    console.log('✅ Legal Document Analyzer started successfully!');
    console.log('🌐 Service available at: http://localhost:4004');
    console.log('📊 Service endpoints:');
    console.log('   - API: http://localhost:4004/legal-documents');
    console.log('   - Metadata: http://localhost:4004/legal-documents/$metadata');
    console.log('   - Health: http://localhost:4004/health');
    
    return server;
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
