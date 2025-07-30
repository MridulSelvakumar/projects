const express = require('express');
const path = require('path');

const app = express();
const PORT = 4004;

// Serve static files
app.use(express.static('public'));

// Serve Fiori UI
app.use('/ui', express.static(path.join(__dirname, 'app/legal-document-ui')));

// Redirect root to Fiori UI
app.get('/', (req, res) => {
  res.redirect('/ui');
});

// Demo endpoints
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

app.get('/legal-documents', (req, res) => {
  res.json({
    service: "LegalDocumentService",
    entities: [
      "Documents", "Clauses", "Parties", "DocumentQueries",
      "DocumentSummary", "ClauseAnalytics", "ProcessingLogs"
    ],
    actions: [
      "uploadDocument", "processDocument", "searchSimilarClauses", 
      "askQuestion", "bulkProcessDocuments"
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log('🚀 Legal Document Analyzer Demo Server Started!');
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`🎨 Fiori UI: http://localhost:${PORT}/ui`);
  console.log('📊 API Documentation: http://localhost:4004/legal-documents');
  console.log('❤️  Health Check: http://localhost:4004/health');
  console.log('\n✨ This is a demo server showing the project structure.');
  console.log('   The full CAP service would provide complete functionality.');
});
