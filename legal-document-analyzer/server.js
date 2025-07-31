const cds = require('@sap/cds');

// Configure CDS
cds.env.requires.db = { kind: 'sqlite', credentials: { url: ':memory:' } };

async function startServer() {
    try {
        console.log('🚀 Starting SAP CAP Legal Document Analyzer');
        console.log('==========================================');
        
        // Initialize database
        await cds.deploy('db/schema.cds').to('sqlite::memory:');
        console.log('✅ Database initialized');
        
        // Start the server
        const server = await cds.serve('all').in('.');
        
        console.log('');
        console.log('🎯 SAP CAP Server Running:');
        console.log(`   📡 Main Service: http://localhost:${server.server.address().port}`);
        console.log(`   📄 Service Index: http://localhost:${server.server.address().port}/`);
        console.log(`   🔍 OData Services: http://localhost:${server.server.address().port}/$metadata`);
        console.log('');
        console.log('🌐 API Endpoints Available:');
        console.log(`   📱 Legal Document API: http://localhost:${server.server.address().port}/legal-documents/`);
        console.log('');
        console.log('🔗 Backend Services:');
        console.log('   🤖 AI Service: http://localhost:5002');
        console.log('');
        console.log('✅ SAP CAP Server ready!');
        
    } catch (error) {
        console.error('❌ Failed to start CAP server:', error);
        process.exit(1);
    }
}

startServer();
