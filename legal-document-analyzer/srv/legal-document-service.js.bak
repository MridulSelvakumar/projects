const cds = require('@sap/cds');
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;
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

    // Get AI service configuration with error handling
    try {
      this.aiService = await cds.connect.to('ai-service');
      console.log('AI service connected successfully');
    } catch (error) {
      console.warn('AI service connection failed, will use fallback methods:', error.message);
      this.aiService = null;
    }
    
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

    // Implement getDocumentInsights function
    this.on('getDocumentInsights', async (req) => {
      const { documentId } = req.data;

      try {
        // Get document clauses
        const clauses = await SELECT.from('legal.document.analyzer.Clauses')
          .where({ document_ID: documentId });

        // Get document parties
        const parties = await SELECT.from('legal.document.analyzer.Parties')
          .where({ document_ID: documentId });

        // Calculate insights
        const clauseTypes = [...new Set(clauses.map(c => c.clauseType))];
        const partyNames = parties.map(p => p.name);

        // Simple risk assessment based on clause types
        let riskLevel = 'LOW';
        if (clauseTypes.includes('liability') && clauseTypes.includes('termination')) {
          riskLevel = 'HIGH';
        } else if (clauseTypes.includes('liability') || clauseTypes.includes('termination')) {
          riskLevel = 'MEDIUM';
        }

        // Extract key terms from clause content
        const allContent = clauses.map(c => c.content).join(' ');
        const keyTerms = this._extractKeyTerms(allContent);

        return {
          totalClauses: clauses.length,
          clauseTypes: clauseTypes,
          parties: partyNames,
          riskLevel: riskLevel,
          keyTerms: keyTerms
        };
      } catch (error) {
        req.error(500, `Failed to get document insights: ${error.message}`);
      }
    });

    // Implement getSimilarDocuments function
    this.on('getSimilarDocuments', async (req) => {
      const { documentId, threshold = 0.7 } = req.data;

      try {
        // Get the source document
        const sourceDoc = await SELECT.one.from('legal.document.analyzer.Documents')
          .where({ ID: documentId });

        if (!sourceDoc) {
          req.error(404, 'Document not found');
          return;
        }

        // Simple similarity based on document type and clause types
        const sourceClauses = await SELECT.from('legal.document.analyzer.Clauses')
          .where({ document_ID: documentId });

        const sourceClauseTypes = new Set(sourceClauses.map(c => c.clauseType));

        // Find documents with similar clause types
        const allDocuments = await SELECT.from('legal.document.analyzer.Documents')
          .where`ID != ${documentId}`;

        const similarDocuments = [];

        for (const doc of allDocuments) {
          const docClauses = await SELECT.from('legal.document.analyzer.Clauses')
            .where({ document_ID: doc.ID });

          const docClauseTypes = new Set(docClauses.map(c => c.clauseType));

          // Calculate Jaccard similarity
          const intersection = new Set([...sourceClauseTypes].filter(x => docClauseTypes.has(x)));
          const union = new Set([...sourceClauseTypes, ...docClauseTypes]);
          const similarity = intersection.size / union.size;

          if (similarity >= threshold) {
            similarDocuments.push({
              ...doc,
              similarity: similarity
            });
          }
        }

        return similarDocuments.sort((a, b) => b.similarity - a.similarity);
      } catch (error) {
        req.error(500, `Failed to find similar documents: ${error.message}`);
      }
    });

    // Implement bulkProcessDocuments action
    this.on('bulkProcessDocuments', async (req) => {
      const { documentIds } = req.data;
      const results = [];

      for (const documentId of documentIds) {
        try {
          await this._processDocumentAsync(documentId);
          results.push({
            documentId: documentId,
            status: 'SUCCESS',
            message: 'Document processing started'
          });
        } catch (error) {
          results.push({
            documentId: documentId,
            status: 'ERROR',
            message: error.message
          });
        }
      }

      return results;
    });

    // Implement exportDocumentData action
    this.on('exportDocumentData', async (req) => {
      const { documentId, format = 'JSON' } = req.data;

      try {
        // Get document with related data
        const document = await SELECT.one.from('legal.document.analyzer.Documents')
          .where({ ID: documentId });

        if (!document) {
          req.error(404, 'Document not found');
          return;
        }

        const clauses = await SELECT.from('legal.document.analyzer.Clauses')
          .where({ document_ID: documentId });

        const parties = await SELECT.from('legal.document.analyzer.Parties')
          .where({ document_ID: documentId });

        const exportData = {
          document: document,
          clauses: clauses,
          parties: parties,
          exportedAt: new Date().toISOString()
        };

        let exportContent;

        switch (format.toUpperCase()) {
          case 'JSON':
            exportContent = JSON.stringify(exportData, null, 2);
            break;
          case 'CSV':
            exportContent = this._convertToCSV(exportData);
            break;
          default:
            req.error(400, 'Unsupported export format. Use JSON or CSV.');
            return;
        }

        return Buffer.from(exportContent, 'utf8');
      } catch (error) {
        req.error(500, `Export failed: ${error.message}`);
      }
    });

    // Implement getAvailableModels function
    this.on('getAvailableModels', async (req) => {
      try {
        const models = await SELECT.from('legal.document.analyzer.AIConfiguration')
          .where({ isActive: true });

        return models.map(model => ({
          modelName: model.modelName,
          modelType: model.modelType,
          isActive: model.isActive
        }));
      } catch (error) {
        req.error(500, `Failed to get available models: ${error.message}`);
      }
    });

    // Implement updateAIConfiguration action
    this.on('updateAIConfiguration', async (req) => {
      const { modelName, parameters } = req.data;

      try {
        await UPDATE('legal.document.analyzer.AIConfiguration')
          .set({
            parameters: parameters,
            updatedAt: new Date()
          })
          .where({ modelName: modelName });

        return `AI configuration updated for model: ${modelName}`;
      } catch (error) {
        req.error(500, `Failed to update AI configuration: ${error.message}`);
      }
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
    // Try multiple approaches for AI service calls

    // First, try the direct API call
    try {
      const response = await axios.post('http://localhost:5000/api/query', {
        question: question,
        context: context,
        model: 'llama3'
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.answer) {
        return {
          answer: response.data.answer,
          confidence: response.data.confidence || 0.8,
          source: 'ai-service'
        };
      }
    } catch (error) {
      console.warn('Primary AI service call failed:', error.message);
    }

    // Fallback: Try basic pattern matching
    try {
      const fallbackAnswer = this._generateFallbackAnswer(question, context);
      return {
        answer: fallbackAnswer,
        confidence: 0.6,
        source: 'fallback'
      };
    } catch (fallbackError) {
      console.error('Fallback answer generation failed:', fallbackError.message);
    }

    // Final fallback
    return {
      answer: 'I apologize, but I cannot process your question at the moment. Please try rephrasing your question or contact support.',
      confidence: 0.0,
      source: 'error'
    };
  }

  _generateFallbackAnswer(question, context) {
    const questionLower = question.toLowerCase();

    // Simple pattern matching for common legal questions
    if (questionLower.includes('liability') || questionLower.includes('liable')) {
      const liabilityMatch = context.match(/liability[^.]*\./gi);
      if (liabilityMatch) {
        return `Based on the document, here's what I found about liability: ${liabilityMatch[0]}`;
      }
    }

    if (questionLower.includes('termination') || questionLower.includes('terminate')) {
      const terminationMatch = context.match(/termination[^.]*\./gi);
      if (terminationMatch) {
        return `Regarding termination, the document states: ${terminationMatch[0]}`;
      }
    }

    if (questionLower.includes('confidential') || questionLower.includes('nda')) {
      const confidentialMatch = context.match(/confidential[^.]*\./gi);
      if (confidentialMatch) {
        return `About confidentiality, the document mentions: ${confidentialMatch[0]}`;
      }
    }

    if (questionLower.includes('payment') || questionLower.includes('fee')) {
      const paymentMatch = context.match(/payment[^.]*\./gi);
      if (paymentMatch) {
        return `Regarding payments, the document states: ${paymentMatch[0]}`;
      }
    }

    // Generic fallback
    const sentences = context.split('.').filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      return `Based on the document content, here's relevant information: ${sentences[0].trim()}.`;
    }

    return 'I found relevant content in the document, but I need more specific information to provide a detailed answer.';
  }

  async _generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for embedding generation');
    }

    // Try the AI service first
    try {
      const response = await axios.post('http://localhost:5000/api/embed', {
        text: text.trim()
      }, {
        timeout: 15000, // 15 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.embedding) {
        return response.data.embedding;
      } else {
        throw new Error('Invalid response from embedding service');
      }
    } catch (error) {
      console.warn('AI service embedding failed:', error.message);

      // Fallback: Generate a simple hash-based embedding
      return this._generateSimpleEmbedding(text);
    }
  }

  _generateSimpleEmbedding(text) {
    // Simple fallback embedding based on text characteristics
    // This is not as good as a real embedding but provides basic functionality
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const embedding = new Array(384).fill(0); // Match sentence-transformers dimension

    // Use word frequency and position to create a simple embedding
    words.forEach((word, index) => {
      const hash = this._simpleHash(word);
      const position = index % embedding.length;
      embedding[position] += (hash % 100) / 100.0;
    });

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }

    return embedding;
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async _retrieveRelevantClauses(documentId, question) {
    try {
      // Generate embedding for the question
      const questionEmbedding = await this._generateEmbedding(question);

      // Get all clauses for the document
      const documentClauses = await SELECT.from('legal.document.analyzer.Clauses')
        .where({ document_ID: documentId });

      if (documentClauses.length === 0) {
        return [];
      }

      // Use vector search to find similar clauses within the document
      const allSimilarClauses = await this._vectorSearch(questionEmbedding, 0.3); // Lower threshold for more results

      // Filter to only include clauses from the specified document
      const relevantClauses = allSimilarClauses.filter(clause =>
        clause.document_ID === documentId
      );

      // If vector search doesn't find enough results, fall back to keyword matching
      if (relevantClauses.length < 3) {
        const keywordMatches = documentClauses.filter(clause => {
          const questionWords = question.toLowerCase().split(/\W+/);
          const clauseContent = clause.content.toLowerCase();

          return questionWords.some(word =>
            word.length > 3 && clauseContent.includes(word)
          );
        });

        // Combine and deduplicate results
        const combinedResults = [...relevantClauses];
        for (const match of keywordMatches) {
          if (!combinedResults.find(c => c.ID === match.ID)) {
            combinedResults.push(match);
          }
        }

        return combinedResults.slice(0, 5);
      }

      return relevantClauses.slice(0, 5);
    } catch (error) {
      console.error('Clause retrieval failed:', error.message);

      // Final fallback: return first few clauses from the document
      try {
        const fallbackClauses = await SELECT.from('legal.document.analyzer.Clauses')
          .where({ document_ID: documentId })
          .limit(3);
        return fallbackClauses;
      } catch (fallbackError) {
        console.error('Fallback clause retrieval failed:', fallbackError.message);
        return [];
      }
    }
  }

  async _extractClauses(documentId, text) {
    try {
      const response = await axios.post('http://localhost:5000/api/extract-clauses', {
        text: text,
        document_id: documentId
      });

      const clauses = response.data.clauses || [];

      // Store extracted clauses and generate embeddings
      for (const clause of clauses) {
        const clauseId = uuidv4();

        // Store the clause
        await INSERT.into('legal.document.analyzer.Clauses').entries({
          ID: clauseId,
          document_ID: documentId,
          clauseType: clause.type,
          title: clause.title,
          content: clause.content,
          confidence: clause.confidence,
          startPosition: clause.start_position,
          endPosition: clause.end_position,
          createdAt: new Date(),
          modifiedAt: new Date()
        });

        // Generate and store clause embedding
        try {
          const clauseEmbedding = await this._generateEmbedding(clause.content);

          await INSERT.into('legal.document.analyzer.ClauseEmbeddings').entries({
            ID: uuidv4(),
            clause_ID: clauseId,
            embedding: Buffer.from(JSON.stringify(clauseEmbedding)),
            embeddingModel: 'all-MiniLM-L6-v2',
            createdAt: new Date()
          });
        } catch (embeddingError) {
          console.warn(`Failed to generate embedding for clause ${clauseId}:`, embeddingError.message);
        }
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

  _extractKeyTerms(text) {
    // Simple key term extraction based on common legal terms
    const legalTerms = [
      'liability', 'damages', 'termination', 'confidential', 'agreement',
      'contract', 'party', 'parties', 'obligation', 'breach', 'remedy',
      'indemnification', 'warranty', 'representation', 'covenant'
    ];

    const words = text.toLowerCase().split(/\W+/);
    const foundTerms = legalTerms.filter(term =>
      words.some(word => word.includes(term))
    );

    return [...new Set(foundTerms)].slice(0, 10); // Return up to 10 unique terms
  }

  _convertToCSV(exportData) {
    // Simple CSV conversion for document data
    let csv = 'Type,ID,Title,Content\n';

    // Add document info
    csv += `Document,${exportData.document.ID},"${exportData.document.title}","${exportData.document.extractedText || ''}"\n`;

    // Add clauses
    for (const clause of exportData.clauses) {
      csv += `Clause,${clause.ID},"${clause.title}","${clause.content}"\n`;
    }

    // Add parties
    for (const party of exportData.parties) {
      csv += `Party,${party.ID},"${party.name}","${party.role}"\n`;
    }

    return csv;
  }

  async _vectorSearch(searchEmbedding, threshold = 0.7) {
    try {
      // Get all clause embeddings
      const clauseEmbeddings = await SELECT.from('legal.document.analyzer.ClauseEmbeddings')
        .columns('clause_ID', 'embedding');

      const similarities = [];

      for (const clauseEmb of clauseEmbeddings) {
        try {
          // Parse the stored embedding
          const storedEmbedding = JSON.parse(clauseEmb.embedding.toString());

          // Calculate cosine similarity
          const similarity = this._calculateCosineSimilarity(searchEmbedding, storedEmbedding);

          if (similarity >= threshold) {
            similarities.push({
              clauseId: clauseEmb.clause_ID,
              similarity: similarity
            });
          }
        } catch (error) {
          console.warn(`Error processing embedding for clause ${clauseEmb.clause_ID}:`, error.message);
        }
      }

      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Get the actual clause data for top matches
      const topMatches = similarities.slice(0, 10); // Top 10 matches
      const clauses = [];

      for (const match of topMatches) {
        const clause = await SELECT.one.from('legal.document.analyzer.Clauses')
          .where({ ID: match.clauseId });

        if (clause) {
          clause.similarity = match.similarity;
          clauses.push(clause);
        }
      }

      return clauses;
    } catch (error) {
      console.error('Vector search failed:', error.message);
      // Fallback to simple text search
      return await this._fallbackTextSearch(searchEmbedding, threshold);
    }
  }

  _calculateCosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async _fallbackTextSearch(searchText, threshold) {
    // Fallback to simple text-based search when vector search fails
    try {
      const clauses = await SELECT.from('legal.document.analyzer.Clauses');

      const matches = clauses.filter(clause => {
        const similarity = this._calculateTextSimilarity(searchText, clause.content);
        return similarity >= threshold;
      });

      return matches.slice(0, 5);
    } catch (error) {
      console.error('Fallback text search failed:', error.message);
      return [];
    }
  }

  _calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

module.exports = LegalDocumentService;
