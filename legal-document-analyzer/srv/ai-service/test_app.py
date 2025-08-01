import pytest
import json
from app import app, clause_extractor

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get('/health')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'status' in data
    assert data['status'] == 'healthy'

def test_generate_embedding(client):
    """Test the embedding generation endpoint."""
    test_data = {
        'text': 'This is a test legal clause about liability limitations.'
    }
    
    response = client.post('/api/embed', 
                          data=json.dumps(test_data),
                          content_type='application/json')
    
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'embedding' in data
    assert 'dimension' in data
    assert 'model' in data
    assert isinstance(data['embedding'], list)
    assert len(data['embedding']) > 0

def test_generate_embedding_empty_text(client):
    """Test embedding generation with empty text."""
    test_data = {'text': ''}
    
    response = client.post('/api/embed',
                          data=json.dumps(test_data),
                          content_type='application/json')
    
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert 'error' in data

def test_extract_clauses(client):
    """Test the clause extraction endpoint."""
    test_text = """
    This Service Agreement ("Agreement") is entered into between Company A and Company B.
    
    LIMITATION OF LIABILITY: In no event shall either party be liable for any indirect, 
    incidental, special, consequential or punitive damages, including without limitation, 
    loss of profits, data, use, goodwill, or other intangible losses.
    
    CONFIDENTIALITY: Each party acknowledges that it may have access to certain 
    confidential information of the other party. Each party agrees to maintain 
    the confidentiality of such information.
    
    TERMINATION: This Agreement may be terminated by either party with thirty (30) 
    days written notice to the other party.
    """
    
    test_data = {
        'text': test_text,
        'document_id': 'test-doc-123'
    }
    
    response = client.post('/api/extract-clauses',
                          data=json.dumps(test_data),
                          content_type='application/json')
    
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'clauses' in data
    assert 'document_id' in data
    assert 'total_clauses' in data
    assert data['document_id'] == 'test-doc-123'
    assert isinstance(data['clauses'], list)
    
    # Check that we found some clauses
    assert data['total_clauses'] > 0
    
    # Verify clause structure
    if len(data['clauses']) > 0:
        clause = data['clauses'][0]
        assert 'type' in clause
        assert 'title' in clause
        assert 'content' in clause
        assert 'confidence' in clause

def test_extract_clauses_empty_text(client):
    """Test clause extraction with empty text."""
    test_data = {
        'text': '',
        'document_id': 'test-doc-empty'
    }
    
    response = client.post('/api/extract-clauses',
                          data=json.dumps(test_data),
                          content_type='application/json')
    
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert 'error' in data

def test_query_llm(client):
    """Test the LLM query endpoint."""
    test_context = """
    LIMITATION OF LIABILITY: In no event shall either party be liable for any indirect, 
    incidental, special, consequential or punitive damages, including without limitation, 
    loss of profits, data, use, goodwill, or other intangible losses.
    """
    
    test_data = {
        'question': 'What types of damages are excluded in the liability clause?',
        'context': test_context,
        'model': 'llama3'
    }
    
    response = client.post('/api/query',
                          data=json.dumps(test_data),
                          content_type='application/json')
    
    # Note: This test might fail if Ollama/LLaMA is not available
    # In that case, the service should return a graceful error response
    assert response.status_code in [200, 500]
    
    data = json.loads(response.data)
    assert 'answer' in data
    assert 'confidence' in data
    
    if response.status_code == 200:
        assert isinstance(data['answer'], str)
        assert len(data['answer']) > 0
        assert isinstance(data['confidence'], (int, float))

def test_query_llm_empty_question(client):
    """Test LLM query with empty question."""
    test_data = {
        'question': '',
        'context': 'Some context',
        'model': 'llama3'
    }
    
    response = client.post('/api/query',
                          data=json.dumps(test_data),
                          content_type='application/json')
    
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert 'error' in data

class TestLegalClauseExtractor:
    """Test the LegalClauseExtractor class."""
    
    def test_extract_liability_clauses(self):
        """Test extraction of liability clauses."""
        text = """
        LIMITATION OF LIABILITY: The Company's liability shall be limited to direct damages only.
        In no event shall the Company be liable for indirect or consequential damages.
        """
        
        clauses = clause_extractor.extract_clauses(text)
        
        # Should find liability-related clauses
        liability_clauses = [c for c in clauses if c['type'] == 'liability']
        assert len(liability_clauses) > 0
    
    def test_extract_confidentiality_clauses(self):
        """Test extraction of confidentiality clauses."""
        text = """
        CONFIDENTIALITY: All confidential information shared between parties must be kept secret.
        Non-disclosure of proprietary information is required under this agreement.
        """
        
        clauses = clause_extractor.extract_clauses(text)
        
        # Should find confidentiality-related clauses
        confidentiality_clauses = [c for c in clauses if c['type'] == 'confidentiality']
        assert len(confidentiality_clauses) > 0
    
    def test_extract_termination_clauses(self):
        """Test extraction of termination clauses."""
        text = """
        TERMINATION: This agreement may be terminated with 30 days notice.
        Either party may end this contract upon written notification.
        """
        
        clauses = clause_extractor.extract_clauses(text)
        
        # Should find termination-related clauses
        termination_clauses = [c for c in clauses if c['type'] == 'termination']
        assert len(termination_clauses) > 0
    
    def test_extract_no_clauses(self):
        """Test with text that contains no recognizable clauses."""
        text = "This is just regular text with no legal clauses."
        
        clauses = clause_extractor.extract_clauses(text)
        
        # Should return empty list or very few clauses
        assert len(clauses) == 0
    
    def test_clause_deduplication(self):
        """Test that duplicate clauses are removed."""
        text = """
        LIABILITY: Company liability is limited. Company liability is limited.
        LIABILITY: Company liability is limited to direct damages.
        """
        
        clauses = clause_extractor.extract_clauses(text)
        
        # Should deduplicate similar clauses
        liability_clauses = [c for c in clauses if c['type'] == 'liability']
        
        # Should have fewer clauses than the number of repetitions
        assert len(liability_clauses) < 3

if __name__ == '__main__':
    pytest.main([__file__])
