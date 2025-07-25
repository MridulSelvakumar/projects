using { legal.document.analyzer as lda } from '../db/schema';

// Main service for legal document analysis
service LegalDocumentService @(path: '/legal-documents') {

  // Document management
  entity Documents as projection on lda.Documents actions {
    action uploadDocument(
      @Core.MediaType: file.mimeType
      file: LargeBinary,
      fileName: String,
      documentType: String
    ) returns Documents;
    
    action processDocument() returns String;
    action reprocessDocument() returns String;
    action deleteDocument() returns String;
  };

  // Clause management with enhanced search
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
  entity DocumentQueries as projection on lda.DocumentQueries actions {
    action askQuestion(
      documentId: UUID,
      question: String,
      queryType: String
    ) returns DocumentQueries;
    
    action provideFeedback(
      feedback: String
    ) returns String;
  };

  // Analytics and reporting views
  @readonly entity DocumentSummary as projection on lda.DocumentSummaryView;
  @readonly entity ClauseAnalytics as projection on lda.ClauseAnalyticsView;
  @readonly entity ProcessingStatus as projection on lda.ProcessingStatusView;
  @readonly entity QueryPerformance as projection on lda.QueryPerformanceView;
  @readonly entity RecentActivity as projection on lda.RecentActivityView;

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
}
