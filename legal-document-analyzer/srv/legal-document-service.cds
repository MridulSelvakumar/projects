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
  action askQuestion(
    documentId: UUID,
    question: String,
    queryType: String
  ) returns {
    response: String;
    confidence: Decimal(3,2);
    queryId: UUID;
  };

  action provideFeedback(
    feedback: String
  ) returns String;

  action uploadDocument(
    file: LargeBinary,
    fileName: String,
    documentType: String,
    sessionToken: String
  ) returns {
    success: Boolean;
    documentId: UUID;
    message: String;
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
}
