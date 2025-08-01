using { legal.document.analyzer as lda } from '../db/schema';
using { legal.document.analyzer as ldaViews } from '../db/views';

// Main service for legal document analysis
service LegalDocumentService @(path: '/legal-documents') {

  // Document management
  @cds.redirection.target
  entity Documents as projection on lda.Documents actions {
    action processDocument() returns String;
    action reprocessDocument() returns String;
    action deleteDocument() returns String;
    action downloadSummary() returns LargeBinary;
  };

  // Clause management with enhanced search
  @cds.redirection.target
  entity Clauses as projection on lda.Clauses {
    *,
    document.title as documentTitle,
    document.documentType as documentType
  } actions {
    action searchSimilarClauses(
      searchText: String,
      threshold: Decimal(3,2)
    ) returns array of Clauses;
  };

  // Party management
  entity Parties as projection on lda.Parties {
    *,
    document.title as documentTitle
  };

  // Query interface for AI interactions
  @cds.redirection.target
  entity DocumentQueries as projection on lda.DocumentQueries;

  // Unbound actions for the service
  action analyzeDocument(
    documentText: String,
    analysisType: String
  ) returns {
    success: Boolean;
    analysis: String;
    confidence: Decimal(3,2);
    timestamp: String;
  };

  action askQuestion(
    documentId: UUID,
    question: String,
    queryType: String,
    documentText: String
  ) returns {
    success: Boolean;
    response: String;
    answer: String;
    confidence: Decimal(3,2);
    queryId: UUID;
  };

  action provideFeedback(
    feedback: String
  ) returns String;

  action getDashboardStats() returns {
    success: Boolean;
    data: {
      metrics: {
        totalDocuments: Integer;
        processedDocuments: Integer;
        totalClauses: Integer;
        totalQueries: Integer;
        avgProcessingTime: Decimal(3,1);
        successRate: Decimal(3,1);
      };
      recentDocuments: array of {
        ID: UUID;
        title: String;
        fileName: String;
        documentType: String;
        status: String;
        uploadedBy: String;
        createdAt: String;
        modifiedAt: String;
      };
      recentActivity: array of {
        title: String;
        documentType: String;
        status: String;
        modifiedAt: String;
        confidence: Decimal(3,2);
      };
      processingStatus: array of {
        status: String;
        count: Integer;
        percentage: Decimal(3,1);
      };
      clauseDistribution: array of {
        clauseType: String;
        clauseCount: Integer;
        avgConfidence: Decimal(3,2);
      };
      queryPerformance: array of {
        avgResponseTime: Decimal(3,1);
        totalQueries: Integer;
        successRate: Decimal(3,1);
      };
    };
    timestamp: String;
    error: String;
  };

  action uploadDocument(
    fileName: String,
    fileContent: String,
    mimeType: String,
    analysisType: String
  ) returns {
    success: Boolean;
    documentId: UUID;
    message: String;
    document: {
      ID: UUID;
      title: String;
      fileName: String;
      documentType: String;
      extractedText: String;
      status: String;
    };
    analysis: {
      analysisType: String;
      content: String;
      confidence: Integer;
      timestamp: String;
    };
    textLength: Integer;
    error: String;
  };

  action generateSummary(
    documentId: UUID
  ) returns {
    summary: String;
    formattedSummary: String;
    confidence: Decimal(3,2);
    method: String;
    downloadUrl: String;
  };

  // Analytics and reporting views
  @readonly entity DocumentSummary as projection on ldaViews.DocumentSummaryView;
  @readonly entity DocumentStatistics as projection on ldaViews.DocumentStatisticsView;
  @readonly entity ClauseAnalytics as projection on ldaViews.ClauseAnalyticsView;
  @readonly entity ClauseTypeDistribution as projection on ldaViews.ClauseTypeDistributionView;
  @readonly entity ProcessingStatus as projection on ldaViews.ProcessingStatusView;
  @readonly entity QueryPerformance as projection on ldaViews.QueryPerformanceView;
  @readonly entity RecentActivity as projection on ldaViews.RecentActivityView;
  @readonly entity ProcessingTimeline as projection on ldaViews.DocumentProcessingTimelineView;

  // Configuration management
  entity AIConfiguration as projection on lda.AIConfiguration;
  
  // Processing logs for monitoring
  @readonly entity ProcessingLogs as projection on lda.ProcessingLogs;

  // Custom functions for advanced operations
  function searchDocuments(
    searchTerm: String,
    documentType: String,
    dateFrom: Date,
    dateTo: Date
  ) returns array of Documents;

  function getDocumentInsights(
    documentId: UUID
  ) returns {
    totalClauses: Integer;
    clauseTypes: array of String;
    parties: array of String;
    riskLevel: String;
    keyTerms: array of String;
  };

  function getSimilarDocuments(
    documentId: UUID,
    threshold: Decimal(3,2)
  ) returns array of Documents;

  // Bulk operations
  action bulkProcessDocuments(
    documentIds: array of UUID
  ) returns array of {
    documentId: UUID;
    status: String;
    message: String;
  };

  action exportDocumentData(
    documentId: UUID,
    format: String // JSON, CSV, PDF
  ) returns LargeBinary;

  // AI model management
  function getAvailableModels() returns array of {
    modelName: String;
    modelType: String;
    isActive: Boolean;
  };

  action updateAIConfiguration(
    modelName: String,
    parameters: String
  ) returns String;

  // Enterprise AI Service Actions
  action performEnterpriseAnalysis(
    documentText: String,
    analysisType: String
  ) returns {
    success: Boolean;
    analysis: {
      success: Boolean;
      analysisType: String;
      timestamp: String;
      results: array of {
        type: String;
        content: String;
        confidence: Decimal;
        riskLevel: String;
      };
      confidence: Integer;
      processingTime: String;
    };
    metadata: {
      wordCount: Integer;
      characterCount: Integer;
      estimatedReadingTime: String;
      documentType: String;
      language: String;
      complexity: String;
    };
    modelInfo: {
      name: String;
      version: String;
      performance: Decimal;
      capabilities: array of String;
      isActive: Boolean;
    };
    timestamp: String;
  };

  action askEnterpriseQuestion(
    question: String,
    documentText: String,
    context: String
  ) returns {
    success: Boolean;
    question: String;
    answer: String;
    confidence: Decimal;
    sources: array of String;
    timestamp: String;
    modelInfo: {
      name: String;
      version: String;
      performance: Decimal;
      capabilities: array of String;
      isActive: Boolean;
    };
  };

  action performEnterpriseRiskAssessment(
    documentText: String,
    riskCategories: array of String
  ) returns {
    success: Boolean;
    overallRiskLevel: String;
    riskCategories: array of {
      category: String;
      level: String;
      score: Decimal;
      findings: array of String;
    };
    recommendations: array of String;
    timestamp: String;
    modelInfo: {
      name: String;
      version: String;
      performance: Decimal;
      capabilities: array of String;
      isActive: Boolean;
    };
  };

  action performEnterpriseComplianceCheck(
    documentText: String,
    regulations: array of String
  ) returns {
    success: Boolean;
    overallCompliance: Decimal;
    regulationResults: array of {
      regulation: String;
      compliant: Boolean;
      score: Decimal;
      findings: array of String;
    };
    violations: array of String;
    recommendations: array of String;
    timestamp: String;
    modelInfo: {
      name: String;
      version: String;
      performance: Decimal;
      capabilities: array of String;
      isActive: Boolean;
    };
  };

  action getAIServiceStatus() returns {
    success: Boolean;
    status: {
      aiAnalyzer: Boolean;
      enterpriseAI: Boolean;
      models: {
        totalModels: Integer;
        activeModels: Integer;
        averagePerformance: Integer;
        lastUpdated: String;
      };
      capabilities: array of String;
      timestamp: String;
    };
  };

  // Gen AI + RAG Service Actions
  action analyzeWithGenAI(
    documentText: String,
    analysisType: String
  ) returns {
    success: Boolean;
    analysisType: String;
    analysis: {
      content: String;
      confidence: Decimal;
      sections: array of {
        title: String;
        content: String;
      };
      keyPoints: array of String;
    };
    chunks: Integer;
    timestamp: String;
    model: String;
    ragEnabled: Boolean;
    serviceType: String;
  };

  action askQuestionWithRAG(
    question: String,
    documentText: String,
    context: String
  ) returns {
    success: Boolean;
    question: String;
    answer: String;
    confidence: Decimal;
    sources: array of String;
    relevantChunks: Integer;
    timestamp: String;
    model: String;
    serviceType: String;
  };

  action assessRisksWithRAG(
    documentText: String,
    riskCategories: array of String
  ) returns {
    success: Boolean;
    overallRiskLevel: String;
    riskCategories: array of {
      category: String;
      level: String;
      score: Decimal;
      findings: array of String;
    };
    recommendations: array of String;
    timestamp: String;
    model: String;
    serviceType: String;
  };

  action checkComplianceWithAI(
    documentText: String,
    regulations: array of String
  ) returns {
    success: Boolean;
    overallCompliance: Decimal;
    regulationResults: array of {
      regulation: String;
      compliant: Boolean;
      score: Decimal;
      findings: array of String;
    };
    violations: array of String;
    recommendations: array of String;
    timestamp: String;
    model: String;
    serviceType: String;
  };
}
