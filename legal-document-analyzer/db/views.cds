namespace legal.document.analyzer;

using { legal.document.analyzer as lda } from './schema';

// Document summary view with aggregated information
define view DocumentSummaryView as select from lda.Documents {
  ID,
  title,
  fileName,
  documentType,
  status,
  uploadedBy,
  createdAt,
  modifiedAt,
  
  // Aggregated clause information
  clauses.clauseType as clauseTypes : redirected to lda.Clauses.clauseType,
  count(clauses.ID) as totalClauses : Integer,
  
  // Aggregated party information  
  count(parties.ID) as totalParties : Integer,
  
  // Processing status
  count(embeddings.ID) as embeddingChunks : Integer,
  count(queries.ID) as totalQueries : Integer
} group by ID, title, fileName, documentType, status, uploadedBy, createdAt, modifiedAt;

// Clause analytics view
define view ClauseAnalyticsView as select from lda.Clauses {
  clauseType,
  count(*) as clauseCount : Integer,
  avg(confidence) as avgConfidence : Decimal(3,2),
  min(confidence) as minConfidence : Decimal(3,2),
  max(confidence) as maxConfidence : Decimal(3,2)
} group by clauseType;

// Document processing status view
define view ProcessingStatusView as select from lda.Documents {
  ID,
  title,
  status,
  createdAt,
  
  // Latest processing log
  max(case when logs.operation = 'UPLOAD' then logs.createdAt end) as uploadedAt : Timestamp,
  max(case when logs.operation = 'EXTRACT_TEXT' then logs.createdAt end) as textExtractedAt : Timestamp,
  max(case when logs.operation = 'GENERATE_EMBEDDINGS' then logs.createdAt end) as embeddingsGeneratedAt : Timestamp,
  
  // Processing times
  sum(case when logs.operation = 'EXTRACT_TEXT' then logs.processingTime end) as textExtractionTime : Integer,
  sum(case when logs.operation = 'GENERATE_EMBEDDINGS' then logs.processingTime end) as embeddingTime : Integer
  
} left join lda.ProcessingLogs as logs on logs.document.ID = ID
  group by ID, title, status, createdAt;

// Query performance view
define view QueryPerformanceView as select from lda.DocumentQueries {
  queryType,
  count(*) as queryCount : Integer,
  avg(responseTime) as avgResponseTime : Integer,
  min(responseTime) as minResponseTime : Integer,
  max(responseTime) as maxResponseTime : Integer,
  avg(confidence) as avgConfidence : Decimal(3,2),
  
  // Feedback distribution
  count(case when feedback = 'HELPFUL' then 1 end) as helpfulCount : Integer,
  count(case when feedback = 'NOT_HELPFUL' then 1 end) as notHelpfulCount : Integer,
  count(case when feedback = 'PARTIALLY_HELPFUL' then 1 end) as partiallyHelpfulCount : Integer
} group by queryType;

// Recent activity view for dashboard
define view RecentActivityView as select from lda.Documents {
  ID,
  title,
  documentType,
  status,
  uploadedBy,
  createdAt,
  modifiedAt,
  
  // Latest query information
  max(queries.createdAt) as lastQueryAt : Timestamp,
  count(queries.ID) as queryCount : Integer
  
} left join lda.DocumentQueries as queries on queries.document.ID = ID
  where createdAt >= $now - 30 // Last 30 days
  group by ID, title, documentType, status, uploadedBy, createdAt, modifiedAt
  order by modifiedAt desc;
