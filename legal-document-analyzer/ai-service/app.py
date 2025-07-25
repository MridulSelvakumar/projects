from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
import ollama
import numpy as np
from sentence_transformers import SentenceTransformer
import re
from typing import List, Dict, Any
import json

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize models
embedding_model = None
ollama_client = None

def initialize_models():
    """Initialize AI models on startup"""
    global embedding_model, ollama_client
    
    try:
        # Initialize sentence transformer for embeddings
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Embedding model loaded successfully")
        
        # Initialize Ollama client
        ollama_client = ollama.Client()
        logger.info("Ollama client initialized")
        
        # Test Ollama connection
        models = ollama_client.list()
        logger.info(f"Available Ollama models: {[model['name'] for model in models['models']]}")
        
    except Exception as e:
        logger.error(f"Error initializing models: {str(e)}")

class LegalClauseExtractor:
    """Extract and classify legal clauses from text"""
    
    def __init__(self):
        self.clause_patterns = {
            'liability': [
                r'liability.*?(?:limited|excluded|disclaimed)',
                r'damages.*?(?:consequential|indirect|special)',
                r'limitation.*?liability',
                r'exclude.*?liability'
            ],
            'confidentiality': [
                r'confidential.*?information',
                r'non-disclosure',
                r'proprietary.*?information',
                r'trade.*?secret'
            ],
            'termination': [
                r'termination.*?(?:clause|provision)',
                r'terminate.*?agreement',
                r'end.*?contract',
                r'expiry.*?term'
            ],
            'payment': [
                r'payment.*?terms',
                r'invoice.*?(?:payment|due)',
                r'fees.*?payable',
                r'compensation.*?amount'
            ],
            'intellectual_property': [
                r'intellectual.*?property',
                r'copyright.*?ownership',
                r'patent.*?rights',
                r'trademark.*?license'
            ]
        }
    
    def extract_clauses(self, text: str) -> List[Dict[str, Any]]:
        """Extract clauses from legal document text"""
        clauses = []
        sentences = self._split_into_sentences(text)
        
        for clause_type, patterns in self.clause_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
                for match in matches:
                    # Extract surrounding context
                    start_pos = max(0, match.start() - 200)
                    end_pos = min(len(text), match.end() + 200)
                    context = text[start_pos:end_pos].strip()
                    
                    clause = {
                        'type': clause_type,
                        'title': f"{clause_type.replace('_', ' ').title()} Clause",
                        'content': context,
                        'confidence': 0.8,  # Pattern-based confidence
                        'start_position': match.start(),
                        'end_position': match.end()
                    }
                    clauses.append(clause)
        
        return self._deduplicate_clauses(clauses)
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _deduplicate_clauses(self, clauses: List[Dict]) -> List[Dict]:
        """Remove duplicate clauses based on content similarity"""
        unique_clauses = []
        for clause in clauses:
            is_duplicate = False
            for existing in unique_clauses:
                if self._calculate_similarity(clause['content'], existing['content']) > 0.8:
                    is_duplicate = True
                    break
            if not is_duplicate:
                unique_clauses.append(clause)
        return unique_clauses
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity using simple word overlap"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        return len(intersection) / len(union) if union else 0

# Initialize clause extractor
clause_extractor = LegalClauseExtractor()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': embedding_model is not None,
        'ollama_available': ollama_client is not None
    })

@app.route('/api/embed', methods=['POST'])
def generate_embedding():
    """Generate embeddings for text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        if embedding_model is None:
            return jsonify({'error': 'Embedding model not loaded'}), 500
        
        # Generate embedding
        embedding = embedding_model.encode(text)
        
        return jsonify({
            'embedding': embedding.tolist(),
            'dimension': len(embedding),
            'model': 'all-MiniLM-L6-v2'
        })
        
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/extract-clauses', methods=['POST'])
def extract_clauses():
    """Extract clauses from legal document text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        document_id = data.get('document_id', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # Extract clauses
        clauses = clause_extractor.extract_clauses(text)
        
        logger.info(f"Extracted {len(clauses)} clauses from document {document_id}")
        
        return jsonify({
            'clauses': clauses,
            'document_id': document_id,
            'total_clauses': len(clauses)
        })
        
    except Exception as e:
        logger.error(f"Error extracting clauses: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/query', methods=['POST'])
def query_llm():
    """Query LLaMA model with context"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        context = data.get('context', '')
        model = data.get('model', 'llama3')
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        # Prepare prompt for legal document analysis
        prompt = f"""You are a legal document analysis assistant. Based on the provided context from legal documents, answer the user's question accurately and concisely.

Context:
{context}

Question: {question}

Please provide a clear, professional answer based only on the information provided in the context. If the context doesn't contain enough information to answer the question, please state that clearly.

Answer:"""

        # Query Ollama
        response = ollama_client.chat(
            model=model,
            messages=[
                {
                    'role': 'user',
                    'content': prompt
                }
            ]
        )
        
        answer = response['message']['content']
        
        # Calculate confidence based on response characteristics
        confidence = min(0.9, len(answer) / 100 * 0.1 + 0.7)
        
        return jsonify({
            'answer': answer,
            'confidence': confidence,
            'model_used': model,
            'context_length': len(context)
        })
        
    except Exception as e:
        logger.error(f"Error querying LLM: {str(e)}")
        return jsonify({
            'answer': 'I apologize, but I encountered an error while processing your question. Please try again.',
            'confidence': 0.0,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    initialize_models()
    app.run(host='0.0.0.0', port=5000, debug=True)
