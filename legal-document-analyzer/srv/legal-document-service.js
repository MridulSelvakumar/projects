const cds = require('@sap/cds');
const AIDocumentAnalyzer = require('./ai-document-analyzer');
const { AIService, AIModels, AIUtils } = require('./ai-service');
const GenAIRAGService = require('./ai-service/genai-rag-service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

class LegalDocumentService extends cds.ApplicationService {

  async init() {
    console.log('Starting Legal Document Service with Enterprise AI initializing...');

    // Initialize AI Document Analyzer
    try {
      this.aiAnalyzer = new AIDocumentAnalyzer();
      console.log('Success: AI Document Analyzer initialized');
    } catch (error) {
      console.error('Error: Failed to initialize AI Analyzer:', error.message);
      this.aiAnalyzer = null;
    }

    // Initialize Enterprise AI Service
    try {
      this.enterpriseAI = new AIService();
      this.aiModels = new AIModels();
      console.log('Success: Enterprise AI Service initialized');
    } catch (error) {
      console.error('Error: Failed to initialize Enterprise AI Service:', error.message);
      this.enterpriseAI = null;
    }

    // Initialize Gen AI + RAG Service
    try {
      this.genAIRAG = new GenAIRAGService();
      console.log('Success: Gen AI + RAG Service initialized');
    } catch (error) {
      console.error('Error: Failed to initialize Gen AI + RAG Service:', error.message);
      this.genAIRAG = null;
    }

    // Configure multer for file uploads
    const storage = multer.memoryStorage();
    this.upload = multer({
      storage: storage,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file type'), false);
        }
      }
    });

    // Initialize storage for documents and queries
    this.documentStore = new Map();
    this.queryHistory = [];

    // Enhanced document upload with AI analysis
    this.on('uploadDocument', async (req) => {
      console.log('Upload: Document upload with AI analysis requested');

      try {
        const { fileName, fileContent, mimeType, analysisType = 'comprehensive' } = req.data;

        if (!fileName || !fileContent) {
          throw new Error('fileName and fileContent are required');
        }

        // Convert base64 to buffer if needed
        const fileBuffer = Buffer.isBuffer(fileContent)
          ? fileContent
          : Buffer.from(fileContent, 'base64');

        const documentId = cds.utils.uuid();

        // Extract text from document
        let extractedText = '';
        let analysisResult = null;

        if (this.aiAnalyzer) {
          try {
            extractedText = await this.aiAnalyzer.extractTextFromFile(
              fileBuffer,
              mimeType,
              fileName
            );

            // Perform AI analysis with Gen AI + RAG
            if (this.genAIRAG) {
              try {
                console.log('AI: Using Gen AI + RAG for analysis...');
                const ragResult = await this.genAIRAG.analyzeDocumentWithRAG(extractedText, analysisType);
                analysisResult = {
                  analysisType: ragResult.analysisType,
                  content: ragResult.analysis.content,
                  confidence: ragResult.confidence,
                  model: ragResult.model,
                  timestamp: ragResult.timestamp,
                  documentLength: extractedText.length,
                  ragEnabled: ragResult.ragEnabled,
                  chunks: ragResult.chunks
                };
                console.log('Success: Gen AI + RAG analysis completed');
              } catch (ragError) {
                console.warn('Warning: Gen AI + RAG failed, falling back to basic AI:', ragError.message);
                analysisResult = await this.aiAnalyzer.analyzeDocument(extractedText, analysisType);
              }
            } else {
              analysisResult = await this.aiAnalyzer.analyzeDocument(extractedText, analysisType);
            }

          } catch (aiError) {
            console.warn('Warning: AI analysis failed, continuing without it:', aiError.message);
          }
        }

        // Store document information (in real app, save to database)
        const documentRecord = {
          id: documentId,
          ID: documentId,
          title: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
          fileName: fileName,
          documentType: this._detectDocumentType(extractedText),
          status: 'PROCESSED',
          uploadedBy: req.user?.id || 'system',
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          fileSize: fileBuffer.length,
          mimeType: mimeType,
          extractedText: extractedText,
          analysis: analysisResult,
          aiAnalysis: analysisResult,
          processingTime: 2.1, // Mock processing time
          clauseCount: analysisResult ? (analysisResult.clauses?.length || 0) : 0
        };

        // Store in our in-memory storage for dashboard
        this.documentStore.set(documentId, documentRecord);

        console.log(`Success: Document ${fileName} processed successfully`);

        return {
          success: true,
          documentId: documentId,
          message: 'Document uploaded and analyzed successfully',
          document: documentRecord,
          analysis: analysisResult,
          textLength: extractedText.length
        };

      } catch (error) {
        console.error('Error: Document upload failed:', error.message);
        return {
          success: false,
          error: error.message,
          documentId: null
        };
      }
    });

    // New endpoint for file upload with multipart form data
    this.on('extractTextFromFile', async (req) => {
      console.log('Extract: Text extraction from uploaded file requested');

      try {
        // This will be called from the frontend with FormData
        const file = req.data.file;
        const fileName = req.data.fileName || 'uploaded-file';
        const mimeType = req.data.mimeType || 'application/octet-stream';

        if (!file) {
          throw new Error('No file provided');
        }

        let fileBuffer;
        if (Buffer.isBuffer(file)) {
          fileBuffer = file;
        } else if (typeof file === 'string') {
          // If it's base64 encoded
          fileBuffer = Buffer.from(file, 'base64');
        } else {
          throw new Error('Invalid file format');
        }

        // Extract text using AI analyzer
        let extractedText = '';
        if (this.aiAnalyzer) {
          extractedText = await this.aiAnalyzer.extractTextFromFile(
            fileBuffer,
            mimeType,
            fileName
          );
        } else {
          throw new Error('AI analyzer not available');
        }

        console.log(`Success: Text extracted from ${fileName}: ${extractedText.length} characters`);

        return {
          success: true,
          extractedText: extractedText,
          fileName: fileName,
          textLength: extractedText.length,
          message: 'Text extracted successfully'
        };

      } catch (error) {
        console.error('Error: Text extraction failed:', error.message);
        return {
          success: false,
          error: error.message,
          extractedText: ''
        };
      }
    });

    // Dashboard Statistics Endpoint
    this.on('getDashboardStats', async (req) => {
      console.log('Dashboard: Getting real-time dashboard statistics');

      try {
        // Get real statistics from our in-memory storage
        const stats = {
          metrics: {
            totalDocuments: this.documentStore.size,
            processedDocuments: Array.from(this.documentStore.values()).filter(doc => doc.status === 'PROCESSED').length,
            totalClauses: Array.from(this.documentStore.values()).reduce((sum, doc) => sum + (doc.clauseCount || 0), 0),
            totalQueries: this.queryHistory.length,
            avgProcessingTime: this._calculateAvgProcessingTime(),
            successRate: this._calculateSuccessRate()
          },
          recentDocuments: Array.from(this.documentStore.values())
            .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
            .slice(0, 10)
            .map(doc => ({
              ID: doc.id,
              title: doc.title || doc.fileName || 'Untitled Document',
              fileName: doc.fileName,
              documentType: doc.documentType || 'Unknown',
              status: doc.status || 'UPLOADED',
              uploadedBy: doc.uploadedBy || 'system',
              createdAt: doc.createdAt,
              modifiedAt: doc.modifiedAt
            })),
          recentActivity: this.queryHistory
            .slice(-15)
            .reverse()
            .map(query => ({
              title: `Question: "${query.question.substring(0, 50)}${query.question.length > 50 ? '...' : ''}"`,
              documentType: query.documentType || 'Document',
              status: query.success ? 'PROCESSED' : 'ERROR',
              modifiedAt: query.timestamp,
              confidence: query.confidence
            })),
          processingStatus: this._getProcessingStatusBreakdown(),
          clauseDistribution: this._getClauseDistribution(),
          queryPerformance: this._getQueryPerformance()
        };

        console.log(`Dashboard: Returning stats for ${stats.metrics.totalDocuments} documents and ${stats.metrics.totalQueries} queries`);

        return {
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        console.error('Dashboard: Error getting statistics:', error.message);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Enhanced AI question answering
    this.on('askQuestion', async (req) => {
      console.log('Question: AI Question asked:', req.data.question);

      try {
        const { question, documentId, documentText } = req.data;

        if (!question) {
          throw new Error('Question is required');
        }

        let textToAnalyze = documentText;

        // If documentId provided, try to get document text from database/cache
        if (documentId && !textToAnalyze) {
          // In a real implementation, fetch from database
          // For now, return error asking for document text
          throw new Error('Document text is required when documentId is not found in cache');
        }

        if (!textToAnalyze) {
          throw new Error('Either documentText or valid documentId is required');
        }

        let answer;
        if (this.aiAnalyzer) {
          answer = await this.aiAnalyzer.answerQuestion(
            textToAnalyze,
            question,
            documentId
          );
        } else {
          // Fallback response
          answer = {
            question: question,
            answer: 'AI analyzer is not available. Please check the configuration.',
            confidence: 0.0,
            model: 'fallback',
            timestamp: new Date().toISOString()
          };
        }

        console.log(`Success: Question answered with confidence: ${answer.confidence}`);

        // Store query in history for dashboard
        const queryRecord = {
          queryId: cds.utils.uuid(),
          question: question,
          answer: answer.answer,
          confidence: answer.confidence,
          success: true,
          timestamp: answer.timestamp,
          documentId: documentId,
          documentType: this._getDocumentType(documentId),
          responseTime: 1.8 // Mock response time
        };
        this.queryHistory.push(queryRecord);

        return {
          success: true,
          queryId: queryRecord.queryId,
          question: question,
          response: answer.answer,
          confidence: answer.confidence,
          model: answer.model,
          timestamp: answer.timestamp,
          documentId: documentId
        };

      } catch (error) {
        console.error('Error: Question answering failed:', error.message);

        // Store failed query in history
        const failedQuery = {
          queryId: cds.utils.uuid(),
          question: req.data.question,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          documentId: req.data.documentId,
          responseTime: 0
        };
        this.queryHistory.push(failedQuery);

        return {
          success: false,
          error: error.message,
          queryId: failedQuery.queryId,
          question: req.data.question
        };
      }
    });

    // AI Document Analysis endpoint
    this.on('analyzeDocument', async (req) => {
      console.log('Analysis: Document analysis requested');

      try {
        const { documentId, documentText, analysisType = 'comprehensive' } = req.data;

        if (!documentText) {
          throw new Error('Document text is required for analysis');
        }

        if (!this.aiAnalyzer) {
          throw new Error('AI analyzer is not available');
        }

        const analysis = await this.aiAnalyzer.analyzeDocument(
          documentText,
          analysisType
        );

        console.log(`Success: Document analysis completed: ${analysisType}`);

        return {
          success: true,
          documentId: documentId,
          analysisType: analysisType,
          analysis: analysis.content,
          confidence: analysis.confidence,
          model: analysis.model,
          timestamp: analysis.timestamp,
          documentLength: analysis.documentLength
        };

      } catch (error) {
        console.error('Error: Document analysis failed:', error.message);
        return {
          success: false,
          error: error.message,
          analysisType: req.data.analysisType
        };
      }
    });

    // Extract specific information from document
    this.on('extractInformation', async (req) => {
      console.log('Analysis: Information extraction requested');

      try {
        const { documentText, extractionType } = req.data;

        if (!documentText || !extractionType) {
          throw new Error('documentText and extractionType are required');
        }

        if (!this.aiAnalyzer) {
          throw new Error('AI analyzer is not available');
        }

        const extraction = await this.aiAnalyzer.extractInformation(
          documentText,
          extractionType
        );

        console.log(`Success: Information extraction completed: ${extractionType}`);

        return {
          success: true,
          extractionType: extractionType,
          data: extraction.data,
          confidence: extraction.confidence,
          timestamp: extraction.timestamp
        };

      } catch (error) {
        console.error('Error: Information extraction failed:', error.message);
        return {
          success: false,
          error: error.message,
          extractionType: req.data.extractionType
        };
      }
    });

    // Compare two documents
    this.on('compareDocuments', async (req) => {
      console.log('Processing: Document comparison requested');

      try {
        const { document1Text, document2Text, comparisonType = 'differences' } = req.data;

        if (!document1Text || !document2Text) {
          throw new Error('Both document1Text and document2Text are required');
        }

        if (!this.aiAnalyzer) {
          throw new Error('AI analyzer is not available');
        }

        const comparison = await this.aiAnalyzer.compareDocuments(
          document1Text,
          document2Text,
          comparisonType
        );

        console.log(`Success: Document comparison completed: ${comparisonType}`);

        return {
          success: true,
          comparisonType: comparisonType,
          analysis: comparison.analysis,
          confidence: comparison.confidence,
          timestamp: comparison.timestamp
        };

      } catch (error) {
        console.error('Error: Document comparison failed:', error.message);
        return {
          success: false,
          error: error.message,
          comparisonType: req.data.comparisonType
        };
      }
    });

    // Generate document insights
    this.on('generateInsights', async (req) => {
      console.log('Insights: Document insights generation requested');

      try {
        const { documentText } = req.data;

        if (!documentText) {
          throw new Error('Document text is required');
        }

        if (!this.aiAnalyzer) {
          throw new Error('AI analyzer is not available');
        }

        const insights = await this.aiAnalyzer.generateInsights(documentText);

        console.log(`Success: Document insights generated`);

        return {
          success: true,
          insights: insights.insights,
          recommendations: insights.recommendations,
          confidence: insights.confidence,
          timestamp: insights.timestamp
        };

      } catch (error) {
        console.error('Error: Insights generation failed:', error.message);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Simple document processing
    this.on('processDocument', 'Documents', async (req) => {
      console.log('Processing: Processing document:', req.params[0]);
      
      return 'Document processing started (mock)';
    });

    // Simple summary generation
    this.on('generateSummary', async (req) => {
      console.log('Summary: Generating summary for document:', req.data.documentId);
      
      return {
        summary: 'This is a mock summary of the legal document.',
        formattedSummary: 'Formatted mock summary with key points.',
        confidence: 0.90,
        method: 'mock',
        downloadUrl: '/mock-summary.pdf'
      };
    });

    // Mock data for analytics views
    this.on('READ', 'DocumentStatistics', async (req) => {
      return [{
        ID: cds.utils.uuid(),
        title: 'Mock Statistics',
        totalDocuments: 156,
        processedDocuments: 142,
        totalClauses: 1247,
        totalQueries: 89,
        avgProcessingTime: 2.3,
        successRate: 94.2
      }];
    });

    this.on('READ', 'ClauseTypeDistribution', async (req) => {
      return [
        { clauseType: 'Liability', clauseCount: 45, avgConfidence: 0.92 },
        { clauseType: 'Confidentiality', clauseCount: 38, avgConfidence: 0.89 },
        { clauseType: 'Termination', clauseCount: 32, avgConfidence: 0.94 },
        { clauseType: 'Payment', clauseCount: 28, avgConfidence: 0.87 },
        { clauseType: 'Intellectual Property', clauseCount: 22, avgConfidence: 0.91 }
      ];
    });

    this.on('READ', 'ProcessingStatus', async (req) => {
      return [
        { status: 'PROCESSED', count: 142, percentage: 91.0 },
        { status: 'PROCESSING', count: 8, percentage: 5.1 },
        { status: 'ERROR', count: 4, percentage: 2.6 },
        { status: 'UPLOADED', count: 2, percentage: 1.3 }
      ];
    });

    this.on('READ', 'RecentActivity', async (req) => {
      return [
        {
          ID: cds.utils.uuid(),
          title: 'Service Agreement processed',
          documentType: 'Contract',
          status: 'PROCESSED',
          modifiedAt: new Date(Date.now() - 300000).toISOString()
        },
        {
          ID: cds.utils.uuid(),
          title: 'NDA analysis started',
          documentType: 'NDA',
          status: 'PROCESSING',
          modifiedAt: new Date(Date.now() - 600000).toISOString()
        }
      ];
    });

    this.on('READ', 'Documents', async (req) => {
      return [
        {
          ID: cds.utils.uuid(),
          title: 'Service Agreement - TechCorp',
          fileName: 'service-agreement.pdf',
          documentType: 'Contract',
          status: 'PROCESSED',
          uploadedBy: 'john.doe',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          modifiedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          ID: cds.utils.uuid(),
          title: 'NDA - StartupXYZ',
          fileName: 'nda-startup.pdf',
          documentType: 'NDA',
          status: 'PROCESSING',
          uploadedBy: 'jane.smith',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          modifiedAt: new Date(Date.now() - 172800000).toISOString()
        }
      ];
    });

    // Register Enterprise AI Service handlers
    this.on('performEnterpriseAnalysis', this.performEnterpriseAnalysis.bind(this));
    this.on('askEnterpriseQuestion', this.askEnterpriseQuestion.bind(this));
    this.on('performEnterpriseRiskAssessment', this.performEnterpriseRiskAssessment.bind(this));
    this.on('performEnterpriseComplianceCheck', this.performEnterpriseComplianceCheck.bind(this));
    this.on('getAIServiceStatus', this.getAIServiceStatus.bind(this));

    // Register Gen AI + RAG handlers
    this.on('analyzeWithGenAI', this.analyzeWithGenAI.bind(this));
    this.on('askQuestionWithRAG', this.askQuestionWithRAG.bind(this));
    this.on('assessRisksWithRAG', this.assessRisksWithRAG.bind(this));
    this.on('checkComplianceWithAI', this.checkComplianceWithAI.bind(this));

    // Add Express routes for file upload
    const app = cds.app;
    if (app) {
      // File upload endpoint
      app.post('/api/extract-text', this.upload.single('file'), async (req, res) => {
        try {
          console.log('API: File upload for text extraction received');

          if (!req.file) {
            return res.status(400).json({
              success: false,
              error: 'No file uploaded'
            });
          }

          const file = req.file;
          const fileName = file.originalname;
          const mimeType = file.mimetype;
          const fileBuffer = file.buffer;

          console.log(`Processing file: ${fileName} (${mimeType})`);

          // Extract text using AI analyzer
          let extractedText = '';
          if (this.aiAnalyzer) {
            extractedText = await this.aiAnalyzer.extractTextFromFile(
              fileBuffer,
              mimeType,
              fileName
            );
          } else {
            throw new Error('AI analyzer not available');
          }

          console.log(`Success: Text extracted from ${fileName}: ${extractedText.length} characters`);

          res.json({
            success: true,
            extractedText: extractedText,
            fileName: fileName,
            textLength: extractedText.length,
            message: 'Text extracted successfully'
          });

        } catch (error) {
          console.error('Error: File upload text extraction failed:', error.message);
          res.status(500).json({
            success: false,
            error: error.message,
            extractedText: ''
          });
        }
      });
    }

    await super.init();
    console.log('Success: Legal Document Service with Enterprise AI initialized successfully');
  }

  /**
   * Detect document type based on content
   */
  _detectDocumentType(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('non-disclosure') || lowerText.includes('confidentiality')) {
      return 'NDA';
    } else if (lowerText.includes('service agreement') || lowerText.includes('service contract')) {
      return 'Service Agreement';
    } else if (lowerText.includes('employment') || lowerText.includes('employee')) {
      return 'Employment Contract';
    } else if (lowerText.includes('lease') || lowerText.includes('rental')) {
      return 'Lease Agreement';
    } else if (lowerText.includes('purchase') || lowerText.includes('sale')) {
      return 'Purchase Agreement';
    } else if (lowerText.includes('license') || lowerText.includes('licensing')) {
      return 'License Agreement';
    } else if (lowerText.includes('partnership') || lowerText.includes('joint venture')) {
      return 'Partnership Agreement';
    } else if (lowerText.includes('contract') || lowerText.includes('agreement')) {
      return 'Contract';
    } else {
      return 'Legal Document';
    }
  }

  /**
   * Validate file type and size
   */
  _validateFile(file) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error(`File too large: ${file.size} bytes (max: ${maxSize} bytes)`);
    }

    return true;
  }

  // Enterprise AI Service Endpoints

  /**
   * Enterprise document analysis endpoint
   */
  async performEnterpriseAnalysis(req) {
    console.log('Analysis: Enterprise AI analysis requested');
    console.log('Request object:', JSON.stringify(req, null, 2));

    try {
      if (!this.enterpriseAI) {
        throw new Error('Enterprise AI Service not available');
      }

      // For actions, parameters come directly in req, not req.data
      const { documentText, analysisType = 'full' } = req;

      // Preprocess document text
      const processedText = AIUtils.preprocessText(documentText);
      const metadata = AIUtils.extractMetadata(processedText);

      // Perform AI analysis
      const analysisResult = await this.enterpriseAI.analyzeDocument({
        data: { documentText: processedText, analysisType }
      });

      return {
        success: true,
        analysis: analysisResult,
        metadata,
        modelInfo: this.aiModels.getModelInfo('document_analysis'),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error: Enterprise analysis failed:', error);
      throw new Error(`Enterprise analysis failed: ${error.message}`);
    }
  }

  /**
   * Enterprise AI question answering
   */
  async askEnterpriseQuestion(req) {
    console.log('Q💬A: Enterprise AI question processing');
    console.log('Request parameters:', JSON.stringify(req, null, 2));

    try {
      if (!this.enterpriseAI) {
        throw new Error('Enterprise AI Service not available');
      }

      const questionData = { question: req.question, documentText: req.documentText, context: req.context };
      console.log('Question data:', JSON.stringify(questionData, null, 2));

      const result = await this.enterpriseAI.askQuestion({ data: questionData });

      return {
        success: true,
        ...result,
        modelInfo: this.aiModels.getModelInfo('question_answering')
      };

    } catch (error) {
      console.error('Error: Enterprise Q&A failed:', error);
      throw new Error(`Enterprise Q&A failed: ${error.message}`);
    }
  }

  /**
   * Enterprise risk assessment
   */
  async performEnterpriseRiskAssessment(req) {
    console.log('Warning: Enterprise risk assessment requested');

    try {
      if (!this.enterpriseAI) {
        throw new Error('Enterprise AI Service not available');
      }

      const result = await this.enterpriseAI.performRiskAssessment({ data: { documentText: req.documentText, riskCategories: req.riskCategories } });

      return {
        success: true,
        ...result,
        modelInfo: this.aiModels.getModelInfo('risk_assessment')
      };

    } catch (error) {
      console.error('Error: Enterprise risk assessment failed:', error);
      throw new Error(`Enterprise risk assessment failed: ${error.message}`);
    }
  }

  /**
   * Enterprise compliance checking
   */
  async performEnterpriseComplianceCheck(req) {
    console.log('Compliance: Enterprise compliance check requested');

    try {
      if (!this.enterpriseAI) {
        throw new Error('Enterprise AI Service not available');
      }

      const result = await this.enterpriseAI.checkCompliance({ data: { documentText: req.documentText, regulations: req.regulations } });

      return {
        success: true,
        ...result,
        modelInfo: this.aiModels.getModelInfo('compliance_check')
      };

    } catch (error) {
      console.error('Error: Enterprise compliance check failed:', error);
      throw new Error(`Enterprise compliance check failed: ${error.message}`);
    }
  }

  /**
   * Get AI service status
   */
  async getAIServiceStatus(req) {
    try {
      const status = {
        aiAnalyzer: !!this.aiAnalyzer,
        enterpriseAI: !!this.enterpriseAI,
        models: this.aiModels ? this.aiModels.getModelStatus() : null,
        capabilities: this.aiModels ? this.aiModels.getActiveModels().map(m => m.type) : [],
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        status
      };

    } catch (error) {
      console.error('Error: AI service status check failed:', error);
      throw new Error(`AI service status check failed: ${error.message}`);
    }
  }

  // Gen AI + RAG Service Methods

  /**
   * Analyze document with Gen AI + RAG
   */
  async analyzeWithGenAI(req) {
    console.log('AI: Gen AI + RAG analysis requested');

    try {
      if (!this.genAIRAG) {
        throw new Error('Gen AI + RAG Service not available');
      }

      const { documentText, analysisType = 'comprehensive' } = req;

      const result = await this.genAIRAG.analyzeDocumentWithRAG(documentText, analysisType);

      return {
        success: true,
        ...result,
        serviceType: 'Gen AI + RAG'
      };

    } catch (error) {
      console.error('Error: Gen AI + RAG analysis failed:', error);
      throw new Error(`Gen AI + RAG analysis failed: ${error.message}`);
    }
  }

  /**
   * Ask question with RAG
   */
  async askQuestionWithRAG(req) {
    console.log('Q💬A: RAG-powered question processing');

    try {
      if (!this.genAIRAG) {
        throw new Error('Gen AI + RAG Service not available');
      }

      const { question, documentText, context } = req;

      const result = await this.genAIRAG.askQuestionWithRAG(question, documentText, context);

      return {
        success: true,
        ...result,
        serviceType: 'RAG Q&A'
      };

    } catch (error) {
      console.error('Error: RAG Q&A failed:', error);
      throw new Error(`RAG Q&A failed: ${error.message}`);
    }
  }

  /**
   * Assess risks with RAG
   */
  async assessRisksWithRAG(req) {
    console.log('Warning: RAG-powered risk assessment');

    try {
      if (!this.genAIRAG) {
        throw new Error('Gen AI + RAG Service not available');
      }

      const { documentText, riskCategories } = req;

      const result = await this.genAIRAG.assessRisksWithRAG(documentText, riskCategories);

      return {
        success: true,
        ...result,
        serviceType: 'RAG Risk Assessment'
      };

    } catch (error) {
      console.error('Error: RAG risk assessment failed:', error);
      throw new Error(`RAG risk assessment failed: ${error.message}`);
    }
  }

  /**
   * Check compliance with AI
   */
  async checkComplianceWithAI(req) {
    console.log('Compliance: AI-powered compliance check');

    try {
      if (!this.genAIRAG) {
        throw new Error('Gen AI + RAG Service not available');
      }

      const { documentText, regulations } = req;

      const result = await this.genAIRAG.checkComplianceWithAI(documentText, regulations);

      return {
        success: true,
        ...result,
        serviceType: 'AI Compliance Check'
      };

    } catch (error) {
      console.error('Error: AI compliance check failed:', error);
      throw new Error(`AI compliance check failed: ${error.message}`);
    }
  }

  // Helper methods for dashboard statistics
  _calculateAvgProcessingTime() {
    const processedDocs = Array.from(this.documentStore.values())
      .filter(doc => doc.processingTime);

    if (processedDocs.length === 0) return 0;

    const totalTime = processedDocs.reduce((sum, doc) => sum + doc.processingTime, 0);
    return Math.round((totalTime / processedDocs.length) * 10) / 10;
  }

  _calculateSuccessRate() {
    if (this.queryHistory.length === 0) return 0;

    const successfulQueries = this.queryHistory.filter(query => query.success).length;
    return Math.round((successfulQueries / this.queryHistory.length) * 1000) / 10;
  }

  _getProcessingStatusBreakdown() {
    const docs = Array.from(this.documentStore.values());
    const total = docs.length;

    if (total === 0) return [];

    const statusCounts = docs.reduce((acc, doc) => {
      const status = doc.status || 'UPLOADED';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 1000) / 10
    }));
  }

  _getClauseDistribution() {
    const docs = Array.from(this.documentStore.values());
    const clauseTypes = {};

    docs.forEach(doc => {
      if (doc.analysis && doc.analysis.clauses) {
        doc.analysis.clauses.forEach(clause => {
          const type = clause.type || 'General';
          if (!clauseTypes[type]) {
            clauseTypes[type] = { count: 0, totalConfidence: 0 };
          }
          clauseTypes[type].count++;
          clauseTypes[type].totalConfidence += clause.confidence || 0.8;
        });
      }
    });

    return Object.entries(clauseTypes).map(([type, data]) => ({
      clauseType: type,
      clauseCount: data.count,
      avgConfidence: Math.round((data.totalConfidence / data.count) * 100) / 100
    })).sort((a, b) => b.clauseCount - a.clauseCount);
  }

  _getQueryPerformance() {
    const recentQueries = this.queryHistory.slice(-20);

    if (recentQueries.length === 0) return [];

    const avgResponseTime = recentQueries.reduce((sum, query) =>
      sum + (query.responseTime || 1.5), 0) / recentQueries.length;

    const successRate = (recentQueries.filter(q => q.success).length / recentQueries.length) * 100;

    return [{
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      totalQueries: recentQueries.length,
      successRate: Math.round(successRate * 10) / 10
    }];
  }

  _getDocumentType(documentId) {
    const doc = this.documentStore.get(documentId);
    return doc ? doc.documentType : 'Unknown';
  }

  _detectDocumentType(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('non-disclosure') || lowerText.includes('confidentiality')) {
      return 'NDA';
    } else if (lowerText.includes('employment') || lowerText.includes('job')) {
      return 'Employment Agreement';
    } else if (lowerText.includes('service') && lowerText.includes('agreement')) {
      return 'Service Agreement';
    } else if (lowerText.includes('license')) {
      return 'License Agreement';
    } else if (lowerText.includes('merger') || lowerText.includes('acquisition')) {
      return 'M&A Contract';
    } else if (lowerText.includes('contract')) {
      return 'Contract';
    } else {
      return 'Legal Document';
    }
  }
}

module.exports = LegalDocumentService;
