const cds = require('@sap/cds');

console.log('🚀 Starting Legal Document Analyzer...');
console.log('📦 CDS version:', cds.version);

// Simple server without custom handlers
cds.serve('srv')
  .to('http://localhost:4004')
  .then(() => {
    console.log('✅ Server started successfully!');
    console.log('🌐 Available at: http://localhost:4004');
    console.log('📊 Service: http://localhost:4004/legal-documents');
    console.log('📋 Metadata: http://localhost:4004/legal-documents/$metadata');
  })
  .catch(err => {
    console.error('❌ Error starting server:', err.message);
    console.error('Stack:', err.stack);
  });
