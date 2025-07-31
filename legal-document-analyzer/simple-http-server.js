require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const PORT = 8080;
const AI_SERVICE_URL = 'http://localhost:5000';

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your-gemini-api-key-here';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

// In-memory storage for demo (in production, use proper database)
let documents = [];
let documentQueries = [];

// Helper function to extract text from different file types
async function extractTextFromFile(buffer, fileName) {
  const ext = path.extname(fileName).toLowerCase();

  try {
    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (ext === '.txt') {
      return buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    return `Error extracting text from ${fileName}: ${error.message}`;
  }
}

// Helper function to call Gemini API directly
async function callGeminiAPI(prompt, context = '') {
  try {
    if (GEMINI_API_KEY === 'your-gemini-api-key-here') {
      console.log('⚠️ Gemini API key not configured - using fallback');
      throw new Error('Gemini API key not configured');
    }

    const fullPrompt = context ? `${prompt}\n\nContext: ${context}` : prompt;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('✅ Gemini API response received');
      return {
        success: true,
        response: response.data.candidates[0].content.parts[0].text,
        confidence: 0.9
      };
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    if (error.response?.data?.error?.message?.includes('API key')) {
      console.warn('🔑 Gemini API key expired or invalid - please update your API key');
    } else {
      console.warn(`Gemini API call failed: ${error.message}`);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to call AI service (fallback)
async function callAIService(endpoint, data) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}${endpoint}`, data, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.warn(`AI service call failed: ${error.message}`);
    return null;
  }
}

// Generate fallback summary when AI is unavailable
function generateFallbackSummary(document) {
  const textLength = document.extractedText ? document.extractedText.length : 0;
  const preview = document.extractedText ? document.extractedText.substring(0, 300) : 'No content available';

  return `
# Document Summary: ${document.title}

## Document Overview
This is a ${document.documentType || 'legal'} document uploaded on ${new Date(document.createdAt).toLocaleDateString()}.

## Key Information
- Document Type: ${document.documentType || 'Unknown'}
- File Name: ${document.fileName}
- File Size: ${document.fileSize} bytes
- Text Length: ${textLength} characters
- Upload Date: ${new Date(document.createdAt).toLocaleDateString()}
- Status: ${document.status}

## Content Preview
${preview}${textLength > 300 ? '...' : ''}

## Analysis Status
This is a basic summary. For detailed AI analysis including risk assessment, key terms, and recommendations, please ensure the AI service is properly connected.

## Next Steps
1. Review the document content
2. Generate detailed AI analysis when available
3. Consult with legal professionals for important decisions
  `;
}

// Routes

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'app/legal-document-ui/index.html'));
});

// API documentation route
app.get('/api', (req, res) => {
  res.json({
    message: 'Legal Document Analyzer API',
    endpoints: [
      'POST /legal-documents/uploadDocument',
      'GET /legal-documents/Documents',
      'POST /legal-documents/askQuestion',
      'GET /health'
    ]
  });
});

// Serve demo version
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'app/legal-document-ui/index.html'));
});

// Document upload endpoint
app.post('/legal-documents/uploadDocument', async (req, res) => {
  console.log('📤 Document upload request received');

  try {
    const { file, fileName, documentType, sessionToken } = req.body;

    if (!file || !fileName) {
      return res.status(400).json({ error: 'File and fileName are required' });
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(file, 'base64');
    const documentId = uuidv4();

    console.log(`📄 Processing file: ${fileName} (${fileBuffer.length} bytes)`);

    // Extract text from document
    const extractedText = await extractTextFromFile(fileBuffer, fileName);
    console.log(`📝 Extracted text length: ${extractedText.length} characters`);

    // Create document record
    const document = {
      ID: documentId,
      title: fileName.replace(/\.[^/.]+$/, ""),
      fileName: fileName,
      fileSize: fileBuffer.length,
      mimeType: getMimeType(fileName),
      uploadedBy: 'demo-user',
      documentType: documentType || 'CONTRACT',
      status: 'PROCESSING',
      content: fileBuffer,
      extractedText: extractedText,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    documents.push(document);

    // Start AI processing in background
    processDocumentWithAI(documentId, extractedText, documentType);

    res.json({
      success: true,
      documentId: documentId,
      message: 'Document uploaded successfully and AI analysis started',
      status: 'PROCESSING',
      fileName: fileName,
      fileSize: fileBuffer.length,
      extractedTextLength: extractedText.length
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: `Upload failed: ${error.message}`
    });
  }
});

// AI processing function
async function processDocumentWithAI(documentId, extractedText, documentType) {
  console.log(`🤖 Starting AI analysis for document: ${documentId}`);

  try {
    // Call AI service for comprehensive analysis
    const analysisResult = await callAIService('/api/analyze', {
      text: extractedText,
      document_id: documentId,
      document_type: documentType || 'CONTRACT'
    });

    // Update document with AI analysis results
    const docIndex = documents.findIndex(d => d.ID === documentId);
    if (docIndex !== -1) {
      documents[docIndex].status = 'PROCESSED';
      documents[docIndex].aiAnalysis = analysisResult;
      documents[docIndex].summary = analysisResult?.analysis?.summary || 'AI analysis completed';
      documents[docIndex].modifiedAt = new Date().toISOString();

      console.log(`✅ AI analysis completed for document: ${documentId}`);
    }

  } catch (error) {
    console.error(`❌ AI analysis failed for document ${documentId}:`, error);

    // Update document status to indicate error
    const docIndex = documents.findIndex(d => d.ID === documentId);
    if (docIndex !== -1) {
      documents[docIndex].status = 'ERROR';
      documents[docIndex].summary = `AI analysis failed: ${error.message}`;
    }
  }
}

// Get documents list
app.get('/legal-documents/Documents', (req, res) => {
  const documentList = documents.map(doc => ({
    ID: doc.ID,
    title: doc.title,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    documentType: doc.documentType,
    status: doc.status,
    uploadedBy: doc.uploadedBy,
    createdAt: doc.createdAt,
    summary: doc.summary
  }));

  res.json({ value: documentList });
});

// Get specific document
app.get('/legal-documents/Documents/:id', (req, res) => {
  const document = documents.find(d => d.ID === req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json(document);
});

// AI Q&A endpoint
app.post('/legal-documents/askQuestion', async (req, res) => {
  console.log('💬 AI Q&A request received');

  try {
    const { documentId, question, queryType } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    let context = '';
    let document = null;

    if (documentId) {
      document = documents.find(d => d.ID === documentId);
      if (document && document.extractedText) {
        context = document.extractedText;
      }
    }

    // Try Gemini API first, then fallback to AI service
    let response, confidence, modelUsed;

    const legalPrompt = `You are a professional legal document analyst. Please analyze the following question about a legal document and provide a clear, accurate response.

Question: ${question}

Please provide a professional legal analysis based on the document content. If you need more specific information, please indicate what additional details would be helpful.`;

    const geminiResult = await callGeminiAPI(legalPrompt, context);

    if (geminiResult.success) {
      response = geminiResult.response;
      confidence = geminiResult.confidence;
      modelUsed = 'gemini-pro';
      console.log('✅ Using Gemini API for response');
    } else {
      // Fallback to AI service
      const aiResponse = await callAIService('/api/rag-query', {
        question: question,
        context: context,
        model: 'llama3'
      });

      if (aiResponse) {
        response = aiResponse.answer;
        confidence = aiResponse.confidence;
        modelUsed = aiResponse.model_used || 'llama3';
        console.log('✅ Using AI service fallback');
      } else {
        // Final fallback
        response = `I understand you're asking: "${question}". ${context ? 'Based on the document content, ' : ''}For detailed legal analysis, please ensure your AI service is running or configure your Gemini API key.`;
        confidence = 0.6;
        modelUsed = 'fallback';
        console.log('⚠️ Using fallback response');
      }
    }

    const queryId = uuidv4();

    // Store query for history
    const queryRecord = {
      ID: queryId,
      document_ID: documentId,
      query: question,
      response: response,
      confidence: confidence,
      queryType: queryType || 'GENERAL',
      createdAt: new Date().toISOString()
    };

    documentQueries.push(queryRecord);

    res.json({
      response: response,
      confidence: confidence,
      queryId: queryId,
      documentAnalyzed: !!context,
      model: modelUsed,
      aiProvider: geminiResult.success ? 'gemini' : 'fallback'
    });

  } catch (error) {
    console.error('❌ AI Q&A error:', error);
    res.status(500).json({ error: `Q&A failed: ${error.message}` });
  }
});

// Generate summary endpoint (POST)
app.post('/legal-documents/generateSummary', async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    const document = documents.find(doc => doc.id === documentId || doc.ID === documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log(`📄 Generating summary for document: ${document.title}`);

    // Generate detailed summary using AI
    let detailedSummary = '';

    if (document.extractedText) {
      const summaryPrompt = `Please provide a comprehensive legal document summary including:
1. Document Overview
2. Key Parties Involved
3. Main Terms and Conditions
4. Important Clauses (liability, termination, payment, etc.)
5. Risk Assessment
6. Recommendations

Document to analyze: ${document.title}`;

      const aiSummary = await callAIService('/api/query', {
        question: summaryPrompt,
        context: document.extractedText,
        model: 'llama3'
      });

      detailedSummary = aiSummary ? aiSummary.response : generateFallbackSummary(document);
    } else {
      detailedSummary = generateFallbackSummary(document);
    }

    // Store the summary
    document.summary = detailedSummary;
    document.summaryGenerated = new Date().toISOString();

    res.json({
      success: true,
      summary: detailedSummary,
      documentId: documentId,
      generatedAt: document.summaryGenerated,
      downloadUrl: `/legal-documents/downloadSummary/${documentId}`
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message
    });
  }
});

// Download summary endpoint
app.get('/legal-documents/downloadSummary/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    const document = documents.find(doc => doc.id === documentId || doc.ID === documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.summary) {
      return res.status(404).json({ error: 'Summary not generated yet' });
    }

    // Create downloadable content
    const downloadContent = `
LEGAL DOCUMENT ANALYSIS SUMMARY
===============================

Document: ${document.title}
File: ${document.fileName}
Upload Date: ${new Date(document.createdAt).toLocaleDateString()}
Document Type: ${document.documentType}
Status: ${document.status}

${document.summary}

---
Generated by Legal Document Analyzer
Powered by LLaMA 3 via Ollama
Generated on: ${new Date().toLocaleString()}
    `;

    // Set headers for download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt"`);
    res.send(downloadContent);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Failed to download summary',
      details: error.message
    });
  }
});

// Generate and download document summary (legacy endpoint)
app.get('/legal-documents/Documents/:id/summary', async (req, res) => {
  console.log('📄 Document summary download requested');

  try {
    const document = documents.find(d => d.ID === req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate detailed summary using AI
    let detailedSummary = '';

    if (document.extractedText) {
      const summaryPrompt = `Please provide a comprehensive legal document summary including:
1. Document Overview
2. Key Parties Involved
3. Main Terms and Conditions
4. Important Clauses (liability, termination, payment, etc.)
5. Risk Assessment
6. Recommendations

Document to analyze: ${document.title}`;

      const aiSummary = await callAIService('/api/query', {
        question: summaryPrompt,
        context: document.extractedText,
        model: 'llama3'
      });

      detailedSummary = aiSummary ? aiSummary.answer : generateFallbackSummary(document);
    } else {
      detailedSummary = generateFallbackSummary(document);
    }

    // Create downloadable summary
    const summaryContent = `
LEGAL DOCUMENT ANALYSIS SUMMARY
===============================

Document: ${document.title}
File: ${document.fileName}
Upload Date: ${new Date(document.createdAt).toLocaleDateString()}
Document Type: ${document.documentType}
Status: ${document.status}

${detailedSummary}

---
Generated by Legal Document Analyzer
Powered by LLaMA 3 via Ollama
Generated on: ${new Date().toLocaleString()}
`;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${document.title}_summary.txt"`);
    res.send(summaryContent);

  } catch (error) {
    console.error('❌ Summary generation error:', error);
    res.status(500).json({ error: `Summary generation failed: ${error.message}` });
  }
});

// Helper functions
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function generateFallbackSummary(document) {
  return `
DOCUMENT OVERVIEW:
This is a ${document.documentType} document titled "${document.title}".

FILE DETAILS:
- Original filename: ${document.fileName}
- File size: ${(document.fileSize / 1024).toFixed(2)} KB
- Upload date: ${new Date(document.createdAt).toLocaleDateString()}
- Processing status: ${document.status}

CONTENT ANALYSIS:
${document.extractedText ?
  `The document contains ${document.extractedText.length} characters of extracted text. ` +
  `Key content preview: ${document.extractedText.substring(0, 500)}...` :
  'No text content could be extracted from this document.'
}

AI ANALYSIS STATUS:
${document.aiAnalysis ?
  'AI analysis has been completed. Detailed insights are available through the Q&A interface.' :
  'AI analysis is pending or encountered an error. Please try re-processing the document.'
}

RECOMMENDATIONS:
1. Review the document content through the web interface
2. Use the AI Q&A feature to ask specific questions about clauses, terms, and conditions
3. Consider having a legal professional review important contractual documents
4. Keep this summary for your records

Note: This is a demonstration summary. Full AI-powered analysis requires proper integration with your Ollama/LLaMA 3 setup.
`;
}

// Health check endpoint
// Analytics endpoints
app.get('/legal-documents/analytics', (req, res) => {
  try {
    // Calculate analytics data
    const totalDocuments = documents.length;
    const processedDocuments = documents.filter(doc => doc.status === 'PROCESSED').length;
    const totalQueries = documentQueries.length;

    // Document type distribution
    const documentTypes = {};
    documents.forEach(doc => {
      const type = doc.documentType || 'Unknown';
      documentTypes[type] = (documentTypes[type] || 0) + 1;
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDocuments = documents.filter(doc =>
      new Date(doc.createdAt) > sevenDaysAgo
    ).length;

    const recentQueries = documentQueries.filter(query =>
      new Date(query.timestamp) > sevenDaysAgo
    ).length;

    // Processing status distribution
    const statusDistribution = {};
    documents.forEach(doc => {
      const status = doc.status || 'Unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    // Average file size
    const totalSize = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
    const avgFileSize = totalDocuments > 0 ? Math.round(totalSize / totalDocuments) : 0;

    res.json({
      overview: {
        totalDocuments,
        processedDocuments,
        totalQueries,
        recentDocuments,
        recentQueries,
        avgFileSize
      },
      documentTypes,
      statusDistribution,
      recentActivity: {
        documents: recentDocuments,
        queries: recentQueries
      },
      performance: {
        processingRate: totalDocuments > 0 ? Math.round((processedDocuments / totalDocuments) * 100) : 0,
        avgResponseTime: '2.3s', // Mock data
        systemHealth: 'Good'
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Individual analytics endpoints for frontend
app.get('/legal-documents/DocumentStatistics', (req, res) => {
  try {
    const documentStats = documents.map(doc => ({
      ID: doc.ID,
      title: doc.title,
      documentType: doc.documentType || 'Unknown',
      status: doc.status || 'UPLOADED',
      totalClauses: Math.floor(Math.random() * 20) + 5, // Mock data
      totalParties: Math.floor(Math.random() * 5) + 1, // Mock data
      totalQueries: documentQueries.filter(q => q.documentId === doc.ID).length,
      avgQueryConfidence: 0.85 // Mock data
    }));

    res.json({ value: documentStats });
  } catch (error) {
    console.error('DocumentStatistics error:', error);
    res.status(500).json({ error: 'Failed to fetch document statistics' });
  }
});

app.get('/legal-documents/ClauseAnalytics', (req, res) => {
  try {
    // Mock clause analytics data
    const clauseTypes = [
      { clauseType: 'Payment Terms', clauseCount: 15, avgConfidence: 0.92, minConfidence: 0.85, maxConfidence: 0.98 },
      { clauseType: 'Termination', clauseCount: 12, avgConfidence: 0.88, minConfidence: 0.80, maxConfidence: 0.95 },
      { clauseType: 'Liability', clauseCount: 8, avgConfidence: 0.90, minConfidence: 0.82, maxConfidence: 0.97 },
      { clauseType: 'Confidentiality', clauseCount: 10, avgConfidence: 0.87, minConfidence: 0.78, maxConfidence: 0.94 },
      { clauseType: 'Intellectual Property', clauseCount: 6, avgConfidence: 0.91, minConfidence: 0.86, maxConfidence: 0.96 }
    ];

    res.json({ value: clauseTypes });
  } catch (error) {
    console.error('ClauseAnalytics error:', error);
    res.status(500).json({ error: 'Failed to fetch clause analytics' });
  }
});

app.get('/legal-documents/QueryPerformance', (req, res) => {
  try {
    const queryPerformance = documentQueries.map(query => ({
      ID: query.ID,
      documentId: query.documentId,
      query: query.query,
      responseTime: Math.floor(Math.random() * 3000) + 500, // Mock response time in ms
      confidence: query.confidence || 0.85,
      timestamp: query.timestamp
    }));

    res.json({ value: queryPerformance });
  } catch (error) {
    console.error('QueryPerformance error:', error);
    res.status(500).json({ error: 'Failed to fetch query performance' });
  }
});

app.get('/legal-documents/RecentActivity', (req, res) => {
  try {
    // Combine documents and queries for recent activity
    const recentActivity = [];

    // Add recent documents
    documents.slice(-10).forEach(doc => {
      recentActivity.push({
        ID: doc.ID,
        title: doc.title,
        documentType: doc.documentType || 'Unknown',
        status: doc.status || 'UPLOADED',
        uploadedBy: doc.uploadedBy || 'Unknown User',
        createdAt: doc.createdAt,
        modifiedAt: doc.modifiedAt || doc.createdAt
      });
    });

    // Sort by modification date
    recentActivity.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    res.json({ value: recentActivity.slice(0, 10) });
  } catch (error) {
    console.error('RecentActivity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

app.get('/legal-documents/ProcessingStatus', (req, res) => {
  try {
    const processingStatus = documents.map(doc => ({
      ID: doc.ID,
      title: doc.title,
      status: doc.status || 'UPLOADED',
      createdAt: doc.createdAt,
      modifiedAt: doc.modifiedAt || doc.createdAt
    }));

    res.json({ value: processingStatus });
  } catch (error) {
    console.error('ProcessingStatus error:', error);
    res.status(500).json({ error: 'Failed to fetch processing status' });
  }
});

app.get('/legal-documents/DocumentSummary', (req, res) => {
  try {
    const documentSummary = documents.map(doc => ({
      ID: doc.ID,
      title: doc.title,
      documentType: doc.documentType || 'Unknown',
      status: doc.status || 'UPLOADED',
      fileSize: doc.fileSize || 0,
      summary: doc.summary || 'No summary available',
      createdAt: doc.createdAt
    }));

    res.json({ value: documentSummary });
  } catch (error) {
    console.error('DocumentSummary error:', error);
    res.status(500).json({ error: 'Failed to fetch document summary' });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    documents_count: documents.length,
    queries_count: documentQueries.length,
    ai_service_url: AI_SERVICE_URL
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Legal Document Analyzer Server Started!');
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📱 Main UI: http://localhost:${PORT}`);
  console.log(`🧪 Test Upload: http://localhost:${PORT}/test-upload.html`);
  console.log(`🤖 AI Service URL: ${AI_SERVICE_URL}`);
  console.log('');
  console.log('📋 Available API Endpoints:');
  console.log('  POST /legal-documents/uploadDocument - Upload documents');
  console.log('  GET  /legal-documents/Documents - List documents');
  console.log('  POST /legal-documents/askQuestion - AI Q&A');
  console.log('  GET  /legal-documents/Documents/:id/summary - Download summary');
  console.log('  GET  /health - Health check');
  console.log('');
  console.log('🔧 Make sure your Ollama/LLaMA 3 is running for full AI functionality!');
});
