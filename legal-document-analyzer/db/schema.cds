namespace legal.document.analyzer;

using { cuid, managed } from '@sap/cds/common';

// User entity - stores user information and sessions
entity Users : cuid, managed {
  username        : String(100) not null;
  email           : String(255) not null;
  firstName       : String(100);
  lastName        : String(100);
  role            : String(50) default 'USER'; // USER, ADMIN, ANALYST
  isActive        : Boolean default true;
  lastLogin       : Timestamp;

  // Relationships
  sessions        : Composition of many UserSessions on sessions.user = $self;
}

// User sessions for tracking login/logout
entity UserSessions : cuid {
  user            : Association to Users not null;
  sessionToken    : String(255) not null;
  loginTime       : Timestamp default $now;
  logoutTime      : Timestamp;
  ipAddress       : String(45); // IPv6 compatible
  userAgent       : String(500);
  isActive        : Boolean default true;
}

// Document entity - stores uploaded legal documents
entity Documents : cuid, managed {
  title           : String(255) not null;
  fileName        : String(255) not null;
  fileSize        : Integer;
  mimeType        : String(100);
  user            : Association to Users;
  uploadedBy      : String(100); // Keep for backward compatibility
  documentType    : String(50); // Contract, NDA, Agreement, etc.
  status          : String(20) default 'UPLOADED'; // UPLOADED, PROCESSING, PROCESSED, ERROR
  content         : LargeBinary; // Store the actual file content
  extractedText   : LargeString; // Extracted text from the document
  summary         : LargeString; // AI-generated summary
  language        : String(10) default 'EN';
  
  // Relationships
  clauses         : Composition of many Clauses on clauses.document = $self;
  parties         : Composition of many Parties on parties.document = $self;
  embeddings      : Composition of many DocumentEmbeddings on embeddings.document = $self;
  queries         : Composition of many DocumentQueries on queries.document = $self;
}

// Clause entity - stores extracted clauses from documents
entity Clauses : cuid, managed {
  document        : Association to Documents not null;
  clauseType      : String(100) not null; // liability, confidentiality, termination, etc.
  title           : String(255);
  content         : LargeString not null;
  startPosition   : Integer; // Position in original document
  endPosition     : Integer;
  confidence      : Decimal(3,2); // AI confidence score 0.00-1.00
  tags            : array of String(50); // Additional tags for categorization
  
  // Vector embeddings for this clause
  embeddings      : Composition of many ClauseEmbeddings on embeddings.clause = $self;
}

// Party entity - stores parties mentioned in documents
entity Parties : cuid, managed {
  document        : Association to Documents not null;
  name            : String(255) not null;
  role            : String(100); // Client, Vendor, Contractor, etc.
  entityType      : String(50); // Individual, Company, Organization
  address         : LargeString;
  contactInfo     : LargeString;
  
  // Relationships to clauses where this party is mentioned
  clauseReferences : Association to many Clauses on clauseReferences.document = document;
}

// Document-level embeddings for semantic search
entity DocumentEmbeddings : cuid {
  document        : Association to Documents not null;
  chunkIndex      : Integer not null; // For large documents split into chunks
  chunkText       : LargeString not null;
  embedding       : LargeBinary not null; // Vector embedding as binary data
  embeddingModel  : String(100) default 'llama3'; // Model used for embedding
  createdAt       : Timestamp default $now;
}

// Clause-level embeddings for precise retrieval
entity ClauseEmbeddings : cuid {
  clause          : Association to Clauses not null;
  embedding       : LargeBinary not null; // Vector embedding as binary data
  embeddingModel  : String(100) default 'llama3';
  createdAt       : Timestamp default $now;
}

// User queries and AI responses
entity DocumentQueries : cuid, managed {
  document        : Association to Documents not null;
  query           : LargeString not null;
  response        : LargeString;
  retrievedClauses : Association to many Clauses on retrievedClauses.document = document; // Clauses used for RAG
  confidence      : Decimal(3,2); // AI response confidence
  responseTime    : Integer; // Response time in milliseconds
  feedback        : String(20); // HELPFUL, NOT_HELPFUL, PARTIALLY_HELPFUL
  
  // Query metadata
  queryType       : String(50); // CLAUSE_SEARCH, PARTY_INFO, SUMMARY, etc.
  language        : String(10) default 'EN';
}

// Configuration for AI models and processing
entity AIConfiguration : cuid {
  modelName       : String(100) not null;
  modelType       : String(50) not null; // EMBEDDING, GENERATION, CLASSIFICATION
  endpoint        : String(500);
  isActive        : Boolean default true;
  parameters      : LargeString; // JSON configuration
  createdAt       : Timestamp default $now;
  updatedAt       : Timestamp default $now;
}

// Audit trail for document processing
entity ProcessingLogs : cuid {
  document        : Association to Documents;
  operation       : String(100) not null; // UPLOAD, EXTRACT_TEXT, GENERATE_EMBEDDINGS, etc.
  status          : String(20) not null; // SUCCESS, ERROR, IN_PROGRESS
  message         : LargeString;
  processingTime  : Integer; // Time in milliseconds
  createdAt       : Timestamp default $now;
}
