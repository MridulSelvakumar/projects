const cds = require('@sap/cds');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

class LegalDocumentService extends cds.ApplicationService {
  
  async init() {
    
    // Get AI service configuration
    this.aiService = await cds.connect.to('ai-service');
    
    // Document upload handler
    this.on('uploadDocument', 'Documents', async (req) => {
      const { file, fileName, documentType } = req.data;
      
      try {
        // Create document record
        const document = await INSERT.into('legal.document.analyzer.Documents').entries({
          ID: uuidv4(),
          title: fileName.replace(/\.[^/.]+$/, ""), // Remove file extension
          fileName: fileName,
          fileSize: file.length,
          mimeType: this._getMimeType(fileName),
          uploadedBy: req.user.id || 'system',
          documentType: documentType || 'CONTRACT',
          status: 'UPLOADED',
          content: file,
          createdAt: new Date(),
          modifiedAt: new Date()
        });

        // Log the upload
        await this._logProcessing(document.ID, 'UPLOAD', 'SUCCESS', 'Document uploaded successfully');

        // Trigger async processing
        this._processDocumentAsync(document.ID);

        return document;
      } catch (error) {
        await this._logProcessing(null, 'UPLOAD', 'ERROR', error.message);
        req.error(500, `Upload failed: ${error.message}`);
      }
    });

    // Document processing handler
    this.on('processDocument', 'Documents', async (req) => {
      const documentId = req.params[0];
      
      try {
        await this._processDocumentAsync(documentId);
        return 'Document processing started';
      } catch (error) {
        req.error(500, `Processing failed: ${error.message}`);
      }
    });

    // AI question handler
    this.on('askQuestion', 'DocumentQueries', async (req) => {
      const { documentId, question, queryType } = req.data;
      const startTime = Date.now();
      
      try {
        // Retrieve relevant clauses using vector search
        const relevantClauses = await this._retrieveRelevantClauses(documentId, question);
        
        // Prepare context for AI
        const context = relevantClauses.map(clause => 
          `Clause Type: ${clause.clauseType}\nContent: ${clause.content}`
        ).join('\n\n');

        // Call AI service
        const aiResponse = await this._callAIService(question, context);
        
        const responseTime = Date.now() - startTime;
        
        // Store query and response
        const query = await INSERT.into('legal.document.analyzer.DocumentQueries').entries({
          ID: uuidv4(),
          document_ID: documentId,
          query: question,
          response: aiResponse.answer,
          confidence: aiResponse.confidence,
          responseTime: responseTime,
          queryType: queryType || 'GENERAL',
          createdAt: new Date(),
          modifiedAt: new Date()
        });

        return query;
      } catch (error) {
        req.error(500, `Query failed: ${error.message}`);
      }
    });

    // Search similar clauses
    this.on('searchSimilarClauses', 'Clauses', async (req) => {
      const { searchText, threshold = 0.7 } = req.data;
      
      try {
        // Generate embedding for search text
        const searchEmbedding = await this._generateEmbedding(searchText);
        
        // Perform vector similarity search
        const similarClauses = await this._vectorSearch(searchEmbedding, threshold);
        
        return similarClauses;
      } catch (error) {
        req.error(500, `Search failed: ${error.message}`);
      }
    });

    // Custom search function
    this.on('searchDocuments', async (req) => {
      const { searchTerm, documentType, dateFrom, dateTo } = req.data;
      
      let query = SELECT.from('legal.document.analyzer.Documents');
      
      if (searchTerm) {
        query = query.where`title like ${`%${searchTerm}%`} or extractedText like ${`%${searchTerm}%`}`;
      }
      
      if (documentType) {
        query = query.and`documentType = ${documentType}`;
      }
      
      if (dateFrom) {
        query = query.and`createdAt >= ${dateFrom}`;
      }
      
      if (dateTo) {
        query = query.and`createdAt <= ${dateTo}`;
      }
      
      return await query;
    });

    return super.init();
  }

  // Private helper methods
  async _processDocumentAsync(documentId) {
    try {
      // Update status
      await UPDATE('legal.document.analyzer.Documents')
        .set({ status: 'PROCESSING' })
        .where({ ID: documentId });

      // Extract text from document
      const extractedText = await this._extractText(documentId);
      
      // Extract clauses using AI
      const clauses = await this._extractClauses(documentId, extractedText);
      
      // Generate embeddings
      await this._generateDocumentEmbeddings(documentId, extractedText);
      
      // Update document status
      await UPDATE('legal.document.analyzer.Documents')
        .set({ 
          status: 'PROCESSED',
          extractedText: extractedText,
          modifiedAt: new Date()
        })
        .where({ ID: documentId });

      await this._logProcessing(documentId, 'PROCESS_COMPLETE', 'SUCCESS', 'Document processed successfully');
      
    } catch (error) {
      await UPDATE('legal.document.analyzer.Documents')
        .set({ status: 'ERROR' })
        .where({ ID: documentId });
        
      await this._logProcessing(documentId, 'PROCESS_COMPLETE', 'ERROR', error.message);
    }
  }

  async _extractText(documentId) {
    const startTime = Date.now();
    
    try {
      const document = await SELECT.one.from('legal.document.analyzer.Documents')
        .where({ ID: documentId });
      
      let extractedText = '';
      
      if (document.mimeType === 'application/pdf') {
        const pdfData = await pdfParse(document.content);
        extractedText = pdfData.text;
      } else if (document.mimeType.includes('word')) {
        const result = await mammoth.extractRawText({ buffer: document.content });
        extractedText = result.value;
      } else {
        extractedText = document.content.toString('utf8');
      }
      
      const processingTime = Date.now() - startTime;
      await this._logProcessing(documentId, 'EXTRACT_TEXT', 'SUCCESS', 
        `Text extracted: ${extractedText.length} characters`, processingTime);
      
      return extractedText;
    } catch (error) {
      await this._logProcessing(documentId, 'EXTRACT_TEXT', 'ERROR', error.message);
      throw error;
    }
  }

  _getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async _logProcessing(documentId, operation, status, message, processingTime = 0) {
    await INSERT.into('legal.document.analyzer.ProcessingLogs').entries({
      ID: uuidv4(),
      document_ID: documentId,
      operation: operation,
      status: status,
      message: message,
      processingTime: processingTime,
      createdAt: new Date()
    });
  }

  async _callAIService(question, context) {
    try {
      const response = await axios.post('http://localhost:5000/api/query', {
        question: question,
        context: context,
        model: 'llama3'
      });

      return {
        answer: response.data.answer,
        confidence: response.data.confidence || 0.8
      };
    } catch (error) {
      console.error('AI service call failed:', error.message);
      return {
        answer: 'I apologize, but I cannot process your question at the moment due to a technical issue.',
        confidence: 0.0
      };
    }
  }

  async _generateEmbedding(text) {
    try {
      const response = await axios.post('http://localhost:5000/api/embed', {
        text: text,
        model: 'llama3'
      });

      return response.data.embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error.message);
      throw error;
    }
  }

  async _retrieveRelevantClauses(documentId, question) {
    try {
      // Generate embedding for the question
      const questionEmbedding = await this._generateEmbedding(question);

      // For now, return top clauses from the document
      // In production, this would use vector similarity search
      const clauses = await SELECT.from('legal.document.analyzer.Clauses')
        .where({ document_ID: documentId })
        .limit(5);

      return clauses;
    } catch (error) {
      console.error('Clause retrieval failed:', error.message);
      return [];
    }
  }

  async _extractClauses(documentId, text) {
    try {
      const response = await axios.post('http://localhost:5000/api/extract-clauses', {
        text: text,
        document_id: documentId
      });

      const clauses = response.data.clauses || [];

      // Store extracted clauses
      for (const clause of clauses) {
        await INSERT.into('legal.document.analyzer.Clauses').entries({
          ID: uuidv4(),
          document_ID: documentId,
          clauseType: clause.type,
          title: clause.title,
          content: clause.content,
          confidence: clause.confidence,
          createdAt: new Date(),
          modifiedAt: new Date()
        });
      }

      return clauses;
    } catch (error) {
      console.error('Clause extraction failed:', error.message);
      return [];
    }
  }

  async _generateDocumentEmbeddings(documentId, text) {
    try {
      const chunkSize = 1000; // Characters per chunk
      const chunks = this._splitTextIntoChunks(text, chunkSize);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this._generateEmbedding(chunks[i]);

        await INSERT.into('legal.document.analyzer.DocumentEmbeddings').entries({
          ID: uuidv4(),
          document_ID: documentId,
          chunkIndex: i,
          chunkText: chunks[i],
          embedding: Buffer.from(JSON.stringify(embedding)),
          embeddingModel: 'llama3',
          createdAt: new Date()
        });
      }

      await this._logProcessing(documentId, 'GENERATE_EMBEDDINGS', 'SUCCESS',
        `Generated ${chunks.length} embedding chunks`);

    } catch (error) {
      await this._logProcessing(documentId, 'GENERATE_EMBEDDINGS', 'ERROR', error.message);
      throw error;
    }
  }

  _splitTextIntoChunks(text, chunkSize) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  }

  async _vectorSearch(searchEmbedding, threshold) {
    // Simplified vector search - in production would use proper vector database
    const clauses = await SELECT.from('legal.document.analyzer.Clauses');

    // Return first few clauses as placeholder
    return clauses.slice(0, 5);
  }
}

module.exports = LegalDocumentService;
