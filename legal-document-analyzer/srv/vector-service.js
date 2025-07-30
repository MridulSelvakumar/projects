const cds = require('@sap/cds');

class VectorService extends cds.ApplicationService {
  
  async init() {
    console.log('🔍 Vector Service initializing...');
    
    // Vector search handler
    this.on('semanticSearch', async (req) => {
      const { query, documentId, searchType, topK } = req.data;
      
      try {
        // Get database connection
        const db = await cds.connect.to('db');
        
        // Generate query embedding (would call AI service in production)
        const queryVector = await this._generateQueryEmbedding(query);
        
        let results;
        
        if (searchType === 'documents') {
          results = await this._searchDocuments(db, queryVector, documentId, topK);
        } else if (searchType === 'clauses') {
          results = await this._searchClauses(db, queryVector, topK);
        } else {
          results = await this._hybridSearch(db, queryVector, topK);
        }
        
        return {
          query,
          results,
          totalResults: results.length,
          searchType,
          processingTime: Date.now() - req.timestamp
        };
        
      } catch (error) {
        console.error('❌ Vector search failed:', error);
        req.error(500, `Vector search failed: ${error.message}`);
      }
    });
    
    // Add document to vector store
    this.on('addDocumentToVectorStore', async (req) => {
      const { documentId, chunks } = req.data;
      
      try {
        const db = await cds.connect.to('db');
        
        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await this._generateEmbedding(chunk.text);
          
          await db.run(
            `INSERT INTO LEGAL_DOCUMENT_ANALYZER_DOCUMENT_EMBEDDINGS 
             (ID, DOCUMENT_ID, CHUNK_ID, CHUNK_TEXT, EMBEDDING_VECTOR, CHUNK_INDEX)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              cds.utils.uuid(),
              documentId,
              `${documentId}_chunk_${i}`,
              chunk.text,
              embedding,
              i
            ]
          );
        }
        
        console.log(`✅ Added ${chunks.length} chunks to vector store for document ${documentId}`);
        
        return {
          documentId,
          chunksProcessed: chunks.length,
          status: 'success'
        };
        
      } catch (error) {
        console.error('❌ Failed to add document to vector store:', error);
        req.error(500, `Failed to add document to vector store: ${error.message}`);
      }
    });
    
    // Add clause to vector store
    this.on('addClauseToVectorStore', async (req) => {
      const { clauseId, clauseType, clauseText, confidence } = req.data;
      
      try {
        const db = await cds.connect.to('db');
        const embedding = await this._generateEmbedding(clauseText);
        
        await db.run(
          `INSERT INTO LEGAL_DOCUMENT_ANALYZER_CLAUSE_EMBEDDINGS 
           (ID, CLAUSE_ID, CLAUSE_TYPE, CLAUSE_TEXT, EMBEDDING_VECTOR, CONFIDENCE_SCORE)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            cds.utils.uuid(),
            clauseId,
            clauseType,
            clauseText,
            embedding,
            confidence
          ]
        );
        
        console.log(`✅ Added clause ${clauseId} to vector store`);
        
        return {
          clauseId,
          status: 'success'
        };
        
      } catch (error) {
        console.error('❌ Failed to add clause to vector store:', error);
        req.error(500, `Failed to add clause to vector store: ${error.message}`);
      }
    });
    
    await super.init();
    console.log('✅ Vector Service initialized successfully');
  }
  
  async _generateQueryEmbedding(query) {
    // In production, this would call the AI service
    // For now, return mock embedding
    return new Array(384).fill(0).map(() => Math.random() * 0.1);
  }
  
  async _generateEmbedding(text) {
    // In production, this would call the AI service
    // For now, return mock embedding
    return new Array(384).fill(0).map(() => Math.random() * 0.1);
  }
  
  async _searchDocuments(db, queryVector, documentId, topK = 5) {
    const vectorString = `[${queryVector.join(',')}]`;
    
    if (documentId) {
      return await db.run(
        `CALL SEMANTIC_DOCUMENT_SEARCH(${vectorString}, ${topK}, '${documentId}')`
      );
    } else {
      return await db.run(
        `CALL SEMANTIC_DOCUMENT_SEARCH(${vectorString}, ${topK}, NULL)`
      );
    }
  }
  
  async _searchClauses(db, queryVector, topK = 5) {
    const vectorString = `[${queryVector.join(',')}]`;
    
    return await db.run(
      `CALL SEMANTIC_CLAUSE_SEARCH(${vectorString}, NULL, ${topK})`
    );
  }
  
  async _hybridSearch(db, queryVector, topK = 10) {
    const vectorString = `[${queryVector.join(',')}]`;
    
    return await db.run(
      `CALL HYBRID_LEGAL_SEARCH(${vectorString}, 'ALL', ${topK})`
    );
  }
}

module.exports = VectorService;
