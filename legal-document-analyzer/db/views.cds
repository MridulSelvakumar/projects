namespace legal.document.analyzer;

using { legal.document.analyzer as lda } from './schema';

// Document summary view with basic information
define view DocumentSummaryView as select from lda.Documents {
  ID,
  title,
  fileName,
  documentType,
  status,
  uploadedBy,
  fileSize,
  language,
  createdAt,
  modifiedAt
};

// Document statistics view with aggregated clause counts
define view DocumentStatisticsView as select from lda.Documents as d
left join lda.Clauses as c on c.document.ID = d.ID
left join lda.Parties as p on p.document.ID = d.ID
left join lda.DocumentQueries as q on q.document.ID = d.ID
{
  key d.ID,
  d.title,
  d.documentType,
  d.status,
  count(distinct c.ID) as totalClauses : Integer,
  count(distinct p.ID) as totalParties : Integer,
  count(distinct q.ID) as totalQueries : Integer,
  avg(q.confidence) as avgQueryConfidence : Decimal(3,2)
} group by d.ID, d.title, d.documentType, d.status;

// Clause analytics view
define view ClauseAnalyticsView as select from lda.Clauses {
  key clauseType,
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
  modifiedAt
};

// Query performance view
define view QueryPerformanceView as select from lda.DocumentQueries {
  key queryType,
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
  modifiedAt
} order by modifiedAt desc;

// Clause type distribution view
define view ClauseTypeDistributionView as select from lda.Clauses {
  key clauseType,
  count(*) as clauseCount : Integer,
  avg(confidence) as avgConfidence : Decimal(3,2)
} group by clauseType;

// Document processing timeline view
define view DocumentProcessingTimelineView as select from lda.ProcessingLogs {
  key ID,
  document.ID as documentID,
  document.title as documentTitle,
  operation,
  status,
  message,
  processingTime,
  createdAt
} order by createdAt desc;
