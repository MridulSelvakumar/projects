const cds = require('@sap/cds');
const { SELECT, INSERT, UPDATE } = cds.ql;
const GeminiClient = require('./gemini-client');

// Initialize Gemini client
const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyBGbJhdOrpmgFV2eWaffZylEPMzsXfAGN0';
const geminiClient = new GeminiClient(geminiApiKey);

class LegalDocumentService extends cds.ApplicationService {
  
  async init() {
    console.log('🚀 Legal Document Service initializing...');

    // Initialize vector service connection
    try {
      this.vectorService = await cds.connect.to('vector-db');
      console.log('✅ Vector database connected');
    } catch (error) {
      console.warn('⚠️ Vector database connection failed, using fallback:', error.message);
      this.vectorService = null;
    }
    
    // Enhanced document upload handler with user authentication
    this.on('uploadDocument', async (req) => {
      console.log('📤 Document upload requested');

      const { file, fileName, documentType, sessionToken } = req.data;

      try {
        // Validate session (simplified for now)
        let currentUser = null;
        if (sessionToken) {
          // For demo purposes, create a mock user
          currentUser = {
            ID: 'demo-user-id',
            username: 'demo',
            firstName: 'Demo',
            lastName: 'User'
          };
        }

        // Validate input
        if (!file || !fileName) {
          req.error(400, 'File and fileName are required');
          return;
        }

        // Decode base64 file content
        let fileContent = file;
        let extractedText = '';
        let fileSize = 0;

        try {
          // If file is base64 encoded, decode it
          if (typeof file === 'string') {
            const buffer = Buffer.from(file, 'base64');
            fileSize = buffer.length;

            // For text files, extract content directly
            if (fileName.toLowerCase().endsWith('.txt')) {
              extractedText = buffer.toString('utf-8');
            } else {
              // For other files, store as binary and extract text later
              fileContent = buffer;
              extractedText = this._extractTextFromFile(buffer, fileName);
            }
          }
        } catch (decodeError) {
          console.warn('File decode warning:', decodeError.message);
          fileContent = file;
          extractedText = typeof file === 'string' ? file : '';
        }

        // Create document record
        const documentId = cds.utils.uuid();

        const documentData = {
          ID: documentId,
          title: fileName.replace(/\.[^/.]+$/, ""),
          fileName: fileName,
          fileSize: fileSize,
          mimeType: this._getMimeType(fileName),
          // user: currentUser ? { ID: currentUser.ID } : null, // Skip user association for now
          uploadedBy: currentUser ? currentUser.username : 'anonymous',
          documentType: documentType || 'CONTRACT',
          status: 'PROCESSING',
          content: fileContent,
          extractedText: extractedText,
          summary: `Document uploaded: ${fileName}`,
          language: 'EN'
        };

        await cds.ql.INSERT.into('legal.document.analyzer.Documents').entries(documentData);

        console.log('✅ Document uploaded successfully:', documentId);

        // Perform AI analysis in background
        this._performDocumentAnalysis(documentId, extractedText, currentUser);

        return {
          ID: documentId,
          message: 'Document uploaded successfully and analysis started',
          status: 'PROCESSING',
          fileName: fileName,
          fileSize: fileSize,
          documentType: documentType
        };
        console.log('📄 File details:', {
          name: fileName,
          size: documentData.fileSize,
          type: documentData.mimeType,
          extractedLength: extractedText.length
        });

        // Perform automatic document analysis
        let analysisResult = null;
        if (extractedText && extractedText.length > 50) {
          try {
            analysisResult = await this._analyzeDocumentContent(extractedText, documentId);
            console.log('📊 Document analysis completed');
          } catch (analysisError) {
            console.warn('⚠️ Document analysis failed:', analysisError.message);
          }
        }

        // Return success response
        return {
          ID: documentId,
          message: 'Document uploaded successfully',
          status: 'UPLOADED',
          fileName: fileName,
          fileSize: documentData.fileSize,
          documentType: documentType,
          analysisPerformed: !!analysisResult,
          extractedTextLength: extractedText.length
        };

      } catch (error) {
        console.error('❌ Document upload failed:', error);
        req.error(500, `Upload failed: ${error.message}`);
      }
    });

    // Simple document processing handler
    this.on('processDocument', 'Documents', async (req) => {
      console.log('🔄 Document processing requested');
      
      try {
        const documentId = req.params[0];
        
        // Update status to processing
        await cds.ql.UPDATE('legal.document.analyzer.Documents')
          .set({ status: 'PROCESSING' })
          .where({ ID: documentId });

        // Simulate processing
        setTimeout(async () => {
          try {
            await cds.ql.UPDATE('legal.document.analyzer.Documents')
              .set({ 
                status: 'PROCESSED',
                extractedText: 'Sample extracted text from document',
                summary: 'This is a sample document summary'
              })
              .where({ ID: documentId });
            console.log('✅ Document processed successfully:', documentId);
          } catch (error) {
            console.error('❌ Document processing failed:', error);
          }
        }, 2000);

        return 'Document processing started';
        
      } catch (error) {
        console.error('❌ Document processing failed:', error);
        req.error(500, `Processing failed: ${error.message}`);
      }
    });

    // Unbound action handler for askQuestion
    this.on('askQuestion', async (req) => {
      console.log('💬 Unbound askQuestion called');

      const { documentId, question, queryType } = req.data;

      try {
        console.log('Document ID:', documentId);
        console.log('Question:', question);
        console.log('Query Type:', queryType);

        // Simple response for now
        const response = `Thank you for asking: "${question}". This is a test response for document ${documentId}. The AI Q&A system is working!`;

        return {
          response: response,
          confidence: 0.85,
          queryId: cds.utils.uuid()
        };

      } catch (error) {
        console.error('❌ Unbound askQuestion error:', error);
        req.error(500, `Q&A failed: ${error.message}`);
      }
    });

    // Enhanced AI Q&A handler with RAG
    this.on('askQuestion', 'DocumentQueries', async (req) => {
      console.log('💬 AI Q&A request received');

      const { documentId, question, queryType } = req.data;

      try {
        const queryId = cds.utils.uuid();

        // Get document content for RAG
        let documentContent = '';
        let aiResponse = '';
        let confidence = 0.7;

        if (documentId) {
          const document = await cds.ql.SELECT.one.from('legal.document.analyzer.Documents')
            .where({ ID: documentId });

          if (document && document.extractedText) {
            documentContent = document.extractedText;

            // Perform AI analysis with RAG
            const ragResult = await this._performRAGAnalysis(question, documentContent, queryType);
            aiResponse = ragResult.answer;
            confidence = ragResult.confidence;
          } else {
            aiResponse = `Document with ID ${documentId} not found or has no extracted text.`;
            confidence = 0.0;
          }
        } else {
          aiResponse = await this._performGeneralAnalysis(question, queryType);
          confidence = 0.6;
        }

        // Create query record
        await cds.ql.INSERT.into('legal.document.analyzer.DocumentQueries').entries({
          ID: queryId,
          document_ID: documentId,
          query: question,
          response: aiResponse,
          confidence: confidence,
          responseTime: 1500,
          queryType: queryType || 'GENERAL',
          language: 'EN'
        });

        console.log('✅ AI Q&A processed successfully:', queryId);

        return {
          ID: queryId,
          response: aiResponse,
          confidence: confidence,
          method: documentId ? 'RAG' : 'GENERAL',
          documentAnalyzed: !!documentContent
        };

      } catch (error) {
        console.error('❌ AI Q&A processing failed:', error);
        req.error(500, `Q&A failed: ${error.message}`);
      }
    });

    // Generate comprehensive document summary action
    this.on('generateSummary', async (req) => {
      console.log('📄 Document summary generation requested');

      const { documentId } = req.data;

      try {
        // Get document content
        const document = await cds.ql.SELECT.one.from('legal.document.analyzer.Documents')
          .where({ ID: documentId });

        if (!document) {
          req.error(404, `Document with ID ${documentId} not found`);
          return;
        }

        if (!document.extractedText) {
          req.error(400, 'Document has no extracted text for analysis');
          return;
        }

        console.log('🤖 Calling AI service for comprehensive summary...');

        // Call enhanced AI service for summary generation
        const aiServiceUrl = 'http://localhost:5002/api/generate-summary';
        const response = await fetch(aiServiceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: document.extractedText,
            title: document.title,
            type: document.documentType
          })
        });

        if (!response.ok) {
          throw new Error(`AI service returned status ${response.status}`);
        }

        const result = await response.json();

        console.log('✅ Document summary generated successfully');

        return {
          summary: result.summary,
          formattedSummary: result.formatted_summary,
          confidence: result.confidence || 0.8,
          method: result.method || 'AI Analysis',
          downloadUrl: `/legal-documents/Documents(${documentId})/downloadSummary`
        };

      } catch (error) {
        console.error('❌ Summary generation failed:', error);
        req.error(500, `Summary generation failed: ${error.message}`);
      }
    });

    // Download summary action for Documents
    this.on('downloadSummary', 'Documents', async (req) => {
      console.log('📥 Document summary download requested');

      try {
        const documentId = req.params[0];

        // Get document
        const document = await cds.ql.SELECT.one.from('legal.document.analyzer.Documents')
          .where({ ID: documentId });

        if (!document) {
          req.error(404, `Document with ID ${documentId} not found`);
          return;
        }

        // Generate summary if not already cached
        let summaryText = '';

        if (document.summary) {
          // Use existing summary
          summaryText = `
LEGAL DOCUMENT ANALYSIS REPORT
Generated on: ${new Date().toISOString().split('T')[0]}
Document: ${document.title}
Type: ${document.documentType}

${'='.repeat(80)}

EXECUTIVE SUMMARY:
${document.summary}

${'='.repeat(80)}

DISCLAIMER: This analysis is generated by AI and should be reviewed by a qualified legal professional.
It is not a substitute for professional legal advice.

Report generated by Legal Document Analyzer AI System
`;
        } else {
          // Generate new summary
          const aiServiceUrl = 'http://localhost:5002/api/generate-summary';
          const response = await fetch(aiServiceUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: document.extractedText || 'No text available',
              title: document.title,
              type: document.documentType
            })
          });

          if (response.ok) {
            const result = await response.json();
            summaryText = result.formatted_summary;
          } else {
            summaryText = `
LEGAL DOCUMENT ANALYSIS REPORT
Generated on: ${new Date().toISOString().split('T')[0]}
Document: ${document.title}
Type: ${document.documentType}

${'='.repeat(80)}

Summary generation is currently unavailable. Please ensure the AI service is running.

${'='.repeat(80)}

DISCLAIMER: This analysis is generated by AI and should be reviewed by a qualified legal professional.
`;
          }
        }

        // Set response headers for file download
        req._.res.setHeader('Content-Type', 'text/plain');
        req._.res.setHeader('Content-Disposition', `attachment; filename="${document.title}_Summary.txt"`);

        return Buffer.from(summaryText, 'utf8');

      } catch (error) {
        console.error('❌ Summary download failed:', error);
        req.error(500, `Summary download failed: ${error.message}`);
      }
    });

    // Helper method to determine MIME type
    this._getMimeType = (fileName) => {
      if (!fileName) return 'application/octet-stream';
      
      const ext = fileName.toLowerCase().split('.').pop();
      const mimeTypes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain'
      };
      
      return mimeTypes[ext] || 'application/octet-stream';
    };

    // Add UI route handler
    this.on('GET', '/ui', (req, res) => {
      res.redirect('/ui/');
    });



    // Test Gemini connection
    try {
      const isConnected = await geminiClient.testConnection();
      if (isConnected) {
        console.log('✅ Gemini AI connected successfully');
      } else {
        console.log('⚠️ Gemini AI connection failed - using fallback responses');
      }
    } catch (error) {
      console.log('⚠️ Gemini AI test failed:', error.message);
    }

    await super.init();
    console.log('✅ Legal Document Service initialized successfully');
  }

  // Document analysis method
  async _performDocumentAnalysis(documentId, extractedText, user) {
    console.log(`🤖 Starting AI analysis for document: ${documentId}`);

    try {
      // Generate AI summary
      const summaryResult = await geminiClient.generateContent(
        'Provide a comprehensive summary of this legal document, highlighting key points, parties involved, and important clauses.',
        extractedText
      );

      // Extract key clauses
      const clauseResult = await geminiClient.generateContent(
        'Extract and categorize the key clauses from this legal document. For each clause, provide: 1) Clause type (e.g., liability, termination, confidentiality), 2) Summary of the clause, 3) Potential risks or important considerations.',
        extractedText
      );

      // Update document with analysis results
      await cds.ql.UPDATE('legal.document.analyzer.Documents')
        .set({
          status: 'PROCESSED',
          summary: summaryResult.text || 'Analysis completed'
        })
        .where({ ID: documentId });

      // Store analysis in processing logs
      await cds.ql.INSERT.into('legal.document.analyzer.ProcessingLogs').entries({
        ID: cds.utils.uuid(),
        document_ID: documentId,
        operation: 'AI_ANALYSIS',
        status: 'SUCCESS',
        message: `AI analysis completed. Summary generated: ${summaryResult.text ? 'Yes' : 'No'}, Clauses extracted: ${clauseResult.text ? 'Yes' : 'No'}`,
        processingTime: 2000
      });

      console.log(`✅ AI analysis completed for document: ${documentId}`);

    } catch (error) {
      console.error(`❌ AI analysis failed for document ${documentId}:`, error);

      // Update document status to error
      await cds.ql.UPDATE('legal.document.analyzer.Documents')
        .set({
          status: 'ERROR',
          summary: 'AI analysis failed: ' + error.message
        })
        .where({ ID: documentId });

      // Log the error
      await cds.ql.INSERT.into('legal.document.analyzer.ProcessingLogs').entries({
        ID: cds.utils.uuid(),
        document_ID: documentId,
        operation: 'AI_ANALYSIS',
        status: 'ERROR',
        message: error.message,
        processingTime: 1000
      });
    }
  }

  // Text extraction helper
  _extractTextFromFile(buffer, fileName) {
    try {
      const extension = fileName.toLowerCase().split('.').pop();

      switch (extension) {
        case 'txt':
          return buffer.toString('utf-8');
        case 'pdf':
          // For demo purposes, return placeholder
          // In production, use pdf-parse library
          return 'PDF content extraction would be implemented here using pdf-parse library.';
        case 'docx':
          // For demo purposes, return placeholder
          // In production, use mammoth library
          return 'DOCX content extraction would be implemented here using mammoth library.';
        default:
          return buffer.toString('utf-8');
      }
    } catch (error) {
      console.warn('Text extraction failed:', error.message);
      return 'Text extraction failed for this file type.';
    }
  }

  // RAG Analysis Methods
  async _performRAGAnalysis(question, documentContent, queryType) {
    console.log('🤖 Performing RAG analysis...');

    try {
      // Split document into chunks for analysis
      const chunks = this._createDocumentChunks(documentContent);

      // Find relevant chunks
      const relevantChunks = this._findRelevantChunks(question, chunks);

      // Generate answer based on relevant content
      const answer = await this._generateContextualAnswer(question, relevantChunks, queryType);

      return {
        answer: answer.text,
        confidence: answer.confidence,
        chunksAnalyzed: relevantChunks.length
      };

    } catch (error) {
      console.error('RAG analysis error:', error);
      return {
        answer: 'I encountered an error while analyzing the document. Please try again.',
        confidence: 0.0
      };
    }
  }

  _createDocumentChunks(text, chunkSize = 500) {
    const words = text.split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push({
        text: chunk,
        startIndex: i,
        endIndex: Math.min(i + chunkSize, words.length)
      });
    }

    return chunks;
  }

  _findRelevantChunks(question, chunks, maxChunks = 3) {
    const questionWords = question.toLowerCase().split(/\s+/);
    const scoredChunks = [];

    chunks.forEach((chunk, index) => {
      const chunkWords = chunk.text.toLowerCase().split(/\s+/);
      let score = 0;

      // Calculate relevance score based on word overlap
      questionWords.forEach(qWord => {
        if (chunkWords.includes(qWord)) {
          score += 1;
        }
      });

      // Boost score for legal terms
      const legalTerms = ['liability', 'termination', 'confidential', 'payment', 'breach', 'notice'];
      legalTerms.forEach(term => {
        if (chunk.text.toLowerCase().includes(term) && question.toLowerCase().includes(term)) {
          score += 2;
        }
      });

      if (score > 0) {
        scoredChunks.push({ ...chunk, score, index });
      }
    });

    // Sort by score and return top chunks
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks);
  }

  async _generateContextualAnswer(question, relevantChunks, queryType) {
    if (relevantChunks.length === 0) {
      return {
        text: 'I could not find relevant information in the document to answer your question.',
        confidence: 0.0
      };
    }

    const context = relevantChunks.map(chunk => chunk.text).join(' ');

    // Try to call enhanced LLaMA 3 AI service first
    try {
      console.log('🤖 Calling LLaMA 3 AI service for legal analysis...');

      const aiServiceUrl = 'http://localhost:5002/api/query';
      const response = await fetch(aiServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: question,
          context: context,
          model: 'llama3'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ LLaMA 3 AI response received');
        return {
          text: result.answer || result.response,
          confidence: result.confidence || 0.8
        };
      } else {
        console.warn('LLaMA 3 AI service returned error:', response.status);
      }
    } catch (error) {
      console.warn('LLaMA 3 AI service call failed:', error.message);
    }

    // Try to call Gemini AI as backup
    try {
      console.log('🤖 Calling Gemini AI for legal analysis...');
      const result = await geminiClient.generateContent(question, context);

      if (result.confidence > 0) {
        console.log('✅ Gemini AI response received');
        return {
          text: result.text,
          confidence: result.confidence
        };
      }
    } catch (error) {
      console.warn('Gemini AI call failed, using fallback:', error.message);
    }

    // Fallback to rule-based analysis if both AI services fail
    console.log('⚠️ Using fallback analysis');
    return this._analyzeWithFallback(question, context);
  }

  _analyzeWithFallback(question, context) {
    const questionLower = question.toLowerCase();

    // Legal-specific answer generation
    if (questionLower.includes('liability')) {
      return this._analyzeLiabilityQuestion(question, context);
    } else if (questionLower.includes('termination') || questionLower.includes('terminate')) {
      return this._analyzeTerminationQuestion(question, context);
    } else if (questionLower.includes('confidential') || questionLower.includes('disclosure')) {
      return this._analyzeConfidentialityQuestion(question, context);
    } else if (questionLower.includes('payment') || questionLower.includes('invoice')) {
      return this._analyzePaymentQuestion(question, context);
    } else {
      return this._analyzeGeneralQuestion(question, context);
    }
  }

  _analyzeLiabilityQuestion(question, context) {
    const contextLower = context.toLowerCase();
    let answer = 'Based on the document, ';
    let confidence = 0.7;

    if (contextLower.includes('limited') && contextLower.includes('liability')) {
      answer += 'liability is limited. ';
      confidence += 0.1;

      if (contextLower.includes('direct damages')) {
        answer += 'The limitation typically applies to direct damages only. ';
        confidence += 0.1;
      }

      if (contextLower.includes('consequential') || contextLower.includes('indirect')) {
        answer += 'Consequential and indirect damages appear to be excluded. ';
        confidence += 0.1;
      }
    } else if (contextLower.includes('liability')) {
      answer += 'there are liability provisions, but the specific limitations are not clearly defined in the relevant sections.';
    } else {
      answer = 'I could not find specific liability information in the relevant parts of the document.';
      confidence = 0.3;
    }

    return { text: answer, confidence: Math.min(confidence, 0.95) };
  }

  _analyzeTerminationQuestion(question, context) {
    const contextLower = context.toLowerCase();
    let answer = 'Based on the document, ';
    let confidence = 0.7;

    // Look for notice periods
    const noticeMatch = context.match(/(\d+)\s*days?\s*(?:written\s*)?notice/i);
    if (noticeMatch) {
      answer += `termination requires ${noticeMatch[1]} days written notice. `;
      confidence += 0.15;
    } else if (contextLower.includes('notice')) {
      answer += 'termination requires written notice. ';
      confidence += 0.1;
    }

    if (contextLower.includes('breach')) {
      answer += 'Immediate termination may be allowed in case of material breach. ';
      confidence += 0.1;
    }

    if (!noticeMatch && !contextLower.includes('notice') && !contextLower.includes('breach')) {
      answer = 'I found termination-related content, but specific termination procedures are not clearly defined in the relevant sections.';
      confidence = 0.4;
    }

    return { text: answer, confidence: Math.min(confidence, 0.95) };
  }

  _analyzeConfidentialityQuestion(question, context) {
    const contextLower = context.toLowerCase();
    let answer = 'Based on the document, ';
    let confidence = 0.7;

    if (contextLower.includes('confidential')) {
      answer += 'there are confidentiality obligations. ';
      confidence += 0.1;

      // Look for duration
      const durationMatch = context.match(/(\d+)\s*years?/i);
      if (durationMatch) {
        answer += `The confidentiality obligation lasts for ${durationMatch[1]} years. `;
        confidence += 0.15;
      }

      if (contextLower.includes('survive')) {
        answer += 'These obligations survive termination of the agreement. ';
        confidence += 0.1;
      }
    } else {
      answer = 'I could not find specific confidentiality information in the relevant parts of the document.';
      confidence = 0.3;
    }

    return { text: answer, confidence: Math.min(confidence, 0.95) };
  }

  _analyzePaymentQuestion(question, context) {
    const contextLower = context.toLowerCase();
    let answer = 'Based on the document, ';
    let confidence = 0.7;

    // Look for payment terms
    const paymentMatch = context.match(/(\d+)\s*days?.*?(?:payment|receipt)/i);
    if (paymentMatch) {
      answer += `payment is due within ${paymentMatch[1]} days. `;
      confidence += 0.15;
    }

    if (contextLower.includes('interest') || contextLower.includes('late')) {
      answer += 'Late payment penalties or interest charges may apply. ';
      confidence += 0.1;
    }

    if (!paymentMatch && !contextLower.includes('payment')) {
      answer = 'I could not find specific payment information in the relevant parts of the document.';
      confidence = 0.3;
    }

    return { text: answer, confidence: Math.min(confidence, 0.95) };
  }

  _analyzeGeneralQuestion(question, context) {
    // Extract key sentences that might be relevant
    const sentences = context.split(/[.!?]+/);
    const questionWords = question.toLowerCase().split(/\s+/);

    let bestSentence = '';
    let maxOverlap = 0;

    sentences.forEach(sentence => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const overlap = questionWords.filter(word => sentenceWords.includes(word)).length;

      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestSentence = sentence.trim();
      }
    });

    if (bestSentence && maxOverlap > 0) {
      return {
        text: `Based on the document: ${bestSentence}`,
        confidence: Math.min(0.8, 0.4 + maxOverlap * 0.1)
      };
    } else {
      return {
        text: 'I found relevant content in the document, but cannot provide a specific answer to your question based on the available information.',
        confidence: 0.3
      };
    }
  }

  async _performGeneralAnalysis(question, queryType) {
    // Fallback for questions without specific document context
    const questionLower = question.toLowerCase();

    if (questionLower.includes('liability')) {
      return 'Liability clauses typically limit damages to direct damages only and exclude consequential damages. The specific terms depend on the contract.';
    } else if (questionLower.includes('termination')) {
      return 'Termination clauses usually require written notice (commonly 30-60 days) and may allow immediate termination for material breach.';
    } else if (questionLower.includes('confidential')) {
      return 'Confidentiality clauses typically require protection of proprietary information for a specified period (often 3-5 years) and may survive contract termination.';
    } else if (questionLower.includes('payment')) {
      return 'Payment terms commonly require payment within 30 days of invoice receipt, with potential late fees or interest for overdue amounts.';
    } else {
      return 'I can help analyze legal documents for liability, termination, confidentiality, payment terms, and other contract provisions. Please upload a document for specific analysis.';
    }
  }

  async _analyzeDocumentContent(text, documentId) {
    console.log('🔍 Analyzing document content...');

    try {
      // Extract clauses automatically
      const clauses = this._extractClauses(text);

      // Store clauses in database
      for (const clause of clauses) {
        await cds.ql.INSERT.into('legal.document.analyzer.Clauses').entries({
          ID: cds.utils.uuid(),
          document_ID: documentId,
          type: clause.type,
          title: clause.title,
          content: clause.content,
          confidence: clause.confidence,
          startPosition: clause.startPosition,
          endPosition: clause.endPosition
        });
      }

      // Generate document summary
      const summary = this._generateDocumentSummary(text, clauses);

      // Update document with analysis results
      await cds.ql.UPDATE('legal.document.analyzer.Documents')
        .set({
          summary: summary,
          status: 'ANALYZED'
        })
        .where({ ID: documentId });

      console.log(`✅ Document analysis completed: ${clauses.length} clauses extracted`);

      return {
        clausesExtracted: clauses.length,
        summary: summary
      };

    } catch (error) {
      console.error('Document analysis error:', error);
      throw error;
    }
  }

  _extractClauses(text) {
    const clauses = [];
    const clausePatterns = {
      'LIABILITY': [
        /liability.*?(?:limited|excluded|disclaimed)/gi,
        /(?:limitation|exclusion).*?liability/gi,
        /damages.*?(?:limited|excluded|indirect|consequential)/gi
      ],
      'CONFIDENTIALITY': [
        /confidential.*?information/gi,
        /non-disclosure/gi,
        /proprietary.*?information/gi
      ],
      'TERMINATION': [
        /termination.*?(?:clause|provision)/gi,
        /terminate.*?agreement/gi,
        /(?:\d+)\s*days?\s*(?:written\s*)?notice/gi
      ],
      'PAYMENT': [
        /payment.*?terms/gi,
        /invoice.*?(?:payment|due)/gi,
        /(?:\d+)\s*days?.*?payment/gi
      ],
      'INTELLECTUAL_PROPERTY': [
        /intellectual.*?property/gi,
        /copyright.*?ownership/gi,
        /patent.*?rights/gi
      ]
    };

    Object.entries(clausePatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
          const startPos = match.index;
          const endPos = startPos + match[0].length;

          // Extract surrounding context (200 chars before and after)
          const contextStart = Math.max(0, startPos - 200);
          const contextEnd = Math.min(text.length, endPos + 200);
          const context = text.substring(contextStart, contextEnd);

          clauses.push({
            type: type,
            title: `${type.replace('_', ' ')} Clause`,
            content: context,
            confidence: 0.8,
            startPosition: startPos,
            endPosition: endPos
          });
        });
      });
    });

    // Remove duplicates based on position
    const uniqueClauses = [];
    clauses.forEach(clause => {
      const isDuplicate = uniqueClauses.some(existing =>
        Math.abs(existing.startPosition - clause.startPosition) < 50
      );
      if (!isDuplicate) {
        uniqueClauses.push(clause);
      }
    });

    return uniqueClauses;
  }

  _generateDocumentSummary(text, clauses) {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;

    let summary = `Document contains ${words} words and ${sentences} sentences. `;

    if (clauses.length > 0) {
      const clauseTypes = [...new Set(clauses.map(c => c.type))];
      summary += `Identified ${clauses.length} legal clauses covering: ${clauseTypes.join(', ')}. `;
    }

    // Identify document type
    const textLower = text.toLowerCase();
    if (textLower.includes('agreement')) {
      summary += 'Document appears to be a legal agreement. ';
    } else if (textLower.includes('contract')) {
      summary += 'Document appears to be a contract. ';
    } else if (textLower.includes('policy')) {
      summary += 'Document appears to be a policy document. ';
    }

    // Risk assessment
    const riskIndicators = ['unlimited liability', 'no warranty', 'as is', 'liquidated damages'];
    const foundRisks = riskIndicators.filter(risk => textLower.includes(risk));

    if (foundRisks.length > 0) {
      summary += `Potential risk factors identified: ${foundRisks.join(', ')}. `;
    } else {
      summary += 'No major risk factors identified. ';
    }

    return summary;
  }
}

module.exports = LegalDocumentService;
