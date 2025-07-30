const cds = require('@sap/cds');
const { expect } = require('chai');
const { INSERT, SELECT, UPDATE, DELETE } = cds.ql;

describe('Legal Document Service Tests', () => {
  let db;

  before(async () => {
    // Setup in-memory database for testing
    cds.env.requires.db = { kind: 'sqlite', credentials: { url: ':memory:' } };
    db = await cds.connect.to('db');
    await cds.deploy('db').to(db);
  });

  describe('Document Management', () => {
    it('should create a new document', async () => {
      const documentData = {
        title: 'Test Contract',
        fileName: 'test-contract.pdf',
        documentType: 'CONTRACT',
        status: 'UPLOADED',
        uploadedBy: 'test-user'
      };

      const result = await db.run(INSERT.into('legal.document.analyzer.Documents').entries(documentData));

      expect(result).to.have.property('affectedRows');
      expect(result.affectedRows).to.equal(1);
    });

    it('should retrieve documents', async () => {
      const documents = await db.run(SELECT.from('legal.document.analyzer.Documents'));

      expect(documents).to.be.an('array');
      expect(documents.length).to.be.greaterThanOrEqual(0);
    });

    it('should update document status', async () => {
      // First create a document
      const documentData = {
        ID: cds.utils.uuid(),
        title: 'Test Update Contract',
        fileName: 'test-update.pdf',
        documentType: 'CONTRACT',
        status: 'UPLOADED'
      };

      await db.run(INSERT.into('legal.document.analyzer.Documents').entries(documentData));

      // Update the status
      await db.run(UPDATE('legal.document.analyzer.Documents')
        .set({ status: 'PROCESSING' })
        .where({ ID: documentData.ID }));

      // Verify the update
      const updated = await db.run(SELECT.one.from('legal.document.analyzer.Documents')
        .where({ ID: documentData.ID }));

      expect(updated.status).to.equal('PROCESSING');
    });
  });

  describe('Clause Management', () => {
    let testDocumentId;

    before(async () => {
      // Create a test document for clause tests
      testDocumentId = cds.utils.uuid();
      const documentData = {
        ID: testDocumentId,
        title: 'Clause Test Contract',
        fileName: 'clause-test.pdf',
        documentType: 'CONTRACT',
        status: 'PROCESSED'
      };

      await db.run(INSERT.into('legal.document.analyzer.Documents').entries(documentData));
    });

    it('should create clauses for a document', async () => {
      const clauseData = {
        document_ID: testDocumentId,
        clauseType: 'liability',
        title: 'Liability Limitation',
        content: 'The liability of each party shall be limited to direct damages only.',
        confidence: 0.85
      };

      const result = await service.create('Clauses', clauseData);
      
      expect(result).to.have.property('ID');
      expect(result.clauseType).to.equal('liability');
      expect(result.confidence).to.equal(0.85);
    });

    it('should retrieve clauses for a document', async () => {
      const clauses = await service.read('Clauses', {
        where: { document_ID: testDocumentId }
      });
      
      expect(clauses).to.be.an('array');
      expect(clauses.length).to.be.greaterThan(0);
    });
  });

  describe('Query Management', () => {
    let testDocumentId;

    before(async () => {
      // Create a test document for query tests
      const documentData = {
        title: 'Query Test Contract',
        fileName: 'query-test.pdf',
        documentType: 'CONTRACT',
        status: 'PROCESSED'
      };

      const document = await service.create('Documents', documentData);
      testDocumentId = document.ID;
    });

    it('should create a document query', async () => {
      const queryData = {
        document_ID: testDocumentId,
        query: 'What is the liability clause?',
        response: 'The liability clause limits damages to direct costs only.',
        confidence: 0.9,
        responseTime: 1500,
        queryType: 'CLAUSE_SEARCH'
      };

      const result = await service.create('DocumentQueries', queryData);
      
      expect(result).to.have.property('ID');
      expect(result.query).to.equal('What is the liability clause?');
      expect(result.queryType).to.equal('CLAUSE_SEARCH');
    });

    it('should retrieve queries for a document', async () => {
      const queries = await service.read('DocumentQueries', {
        where: { document_ID: testDocumentId }
      });
      
      expect(queries).to.be.an('array');
      expect(queries.length).to.be.greaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should search documents by title', async () => {
      const searchResults = await service.run(
        'searchDocuments',
        {
          searchTerm: 'Test',
          documentType: null,
          dateFrom: null,
          dateTo: null
        }
      );
      
      expect(searchResults).to.be.an('array');
      // Should find documents with "Test" in the title
      searchResults.forEach(doc => {
        expect(doc.title).to.include('Test');
      });
    });

    it('should filter documents by type', async () => {
      const searchResults = await service.run(
        'searchDocuments',
        {
          searchTerm: null,
          documentType: 'CONTRACT',
          dateFrom: null,
          dateTo: null
        }
      );
      
      expect(searchResults).to.be.an('array');
      searchResults.forEach(doc => {
        expect(doc.documentType).to.equal('CONTRACT');
      });
    });
  });

  describe('Analytics Views', () => {
    it('should retrieve document summary analytics', async () => {
      const summaries = await service.read('DocumentSummary');
      
      expect(summaries).to.be.an('array');
      if (summaries.length > 0) {
        expect(summaries[0]).to.have.property('totalClauses');
        expect(summaries[0]).to.have.property('totalParties');
      }
    });

    it('should retrieve clause analytics', async () => {
      const analytics = await service.read('ClauseAnalytics');
      
      expect(analytics).to.be.an('array');
      if (analytics.length > 0) {
        expect(analytics[0]).to.have.property('clauseType');
        expect(analytics[0]).to.have.property('clauseCount');
        expect(analytics[0]).to.have.property('avgConfidence');
      }
    });
  });

  after(async () => {
    // Cleanup: Remove test data
    try {
      await db.run(DELETE.from('legal.document.analyzer.DocumentQueries'));
      await db.run(DELETE.from('legal.document.analyzer.Clauses'));
      await db.run(DELETE.from('legal.document.analyzer.Documents'));
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  });
});
