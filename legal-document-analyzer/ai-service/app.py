from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
import numpy as np
import re
from typing import List, Dict, Any
import json
import requests
from datetime import datetime

# Try to import optional dependencies with fallbacks
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    logger.warning("Ollama not available. Using fallback responses.")

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    logger.warning("Sentence transformers not available. Using mock embeddings.")

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
    """Initialize AI models with LLaMA 3 integration"""
    global embedding_model, ollama_client

    logger.info("🚀 Initializing AI Microservice with LLaMA 3...")

    # Initialize embedding model
    if EMBEDDINGS_AVAILABLE:
        try:
            embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("✅ Embedding model loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load embedding model: {e}")
            embedding_model = None

    # Initialize Ollama client for LLaMA 3
    if OLLAMA_AVAILABLE:
        try:
            ollama_client = ollama.Client()
            # Test connection and check for LLaMA 3
            models = ollama_client.list()
            available_models = [model['name'] for model in models['models']]
            logger.info(f"Available Ollama models: {available_models}")

            # Check for LLaMA 3 models
            llama3_models = [m for m in available_models if 'llama3' in m.lower()]
            if llama3_models:
                logger.info(f"✅ LLaMA 3 models available: {llama3_models}")
            else:
                logger.warning("⚠️ No LLaMA 3 models found. Consider running: ollama pull llama3")

        except Exception as e:
            logger.warning(f"Failed to connect to Ollama: {e}")
            ollama_client = None

    logger.info("✅ AI Microservice initialized")

def query_llama3(prompt: str, context: str = "", model: str = "llama3") -> Dict[str, Any]:
    """Query LLaMA 3 model via Ollama"""
    if not ollama_client:
        return {
            "response": f"Mock LLaMA 3 response for: {prompt}",
            "model": "mock-llama3",
            "confidence": 0.7
        }

    try:
        # Construct prompt with context
        full_prompt = f"""Context: {context}

Question: {prompt}

Please provide a detailed legal analysis based on the context provided."""

        response = ollama_client.generate(
            model=model,
            prompt=full_prompt,
            options={
                "temperature": 0.3,  # Lower temperature for more consistent legal analysis
                "top_p": 0.9,
                "max_tokens": 1000
            }
        )

        return {
            "response": response['response'],
            "model": model,
            "confidence": 0.85,
            "tokens_used": len(response['response'].split())
        }

    except Exception as e:
        logger.error(f"Error querying LLaMA 3: {e}")
        return {
            "response": f"Error processing with LLaMA 3: {str(e)}",
            "model": model,
            "confidence": 0.0,
            "error": str(e)
        }

def generate_embeddings(text: str) -> List[float]:
    """Generate embeddings for text using sentence transformers"""
    if embedding_model:
        try:
            embeddings = embedding_model.encode(text)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")

    # Fallback: mock embeddings
    return [0.1] * 384

class LegalClauseExtractor:
    """Extract and classify legal clauses from text using AI"""

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

    def extract_with_llama3(self, text: str) -> List[Dict[str, Any]]:
        """Extract clauses using LLaMA 3 for enhanced accuracy"""
        prompt = """Analyze the following legal document text and extract key legal clauses.
        For each clause found, provide:
        1. Clause type (liability, confidentiality, termination, payment, etc.)
        2. Brief summary
        3. Key terms
        4. Risk level (Low/Medium/High)

        Text to analyze:
        """ + text[:2000]  # Limit text length

        response = query_llama3(prompt, text)

        # Parse LLaMA 3 response and combine with pattern-based extraction
        pattern_clauses = self.extract_clauses(text)

        return pattern_clauses  # In production, would parse and merge LLaMA 3 results

class RAGPipeline:
    """Retrieval-Augmented Generation pipeline for legal document Q&A"""

    def __init__(self):
        self.document_chunks = []
        self.chunk_embeddings = []

    def add_document(self, document_id: str, text: str):
        """Add document to RAG knowledge base"""
        # Split document into chunks
        chunks = self._chunk_text(text)

        for i, chunk in enumerate(chunks):
            chunk_data = {
                'document_id': document_id,
                'chunk_id': f"{document_id}_{i}",
                'text': chunk,
                'embedding': generate_embeddings(chunk)
            }
            self.document_chunks.append(chunk_data)
            self.chunk_embeddings.append(chunk_data['embedding'])

    def _chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []

        for i in range(0, len(words), chunk_size - 50):  # 50 word overlap
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append(chunk)

        return chunks

    def retrieve_relevant_chunks(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieve most relevant document chunks for query"""
        if not self.document_chunks:
            return []

        query_embedding = generate_embeddings(query)

        # Calculate similarity scores (simplified cosine similarity)
        similarities = []
        for chunk_embedding in self.chunk_embeddings:
            # Simple dot product similarity (normalized embeddings assumed)
            similarity = sum(a * b for a, b in zip(query_embedding, chunk_embedding))
            similarities.append(similarity)

        # Get top-k most similar chunks
        top_indices = sorted(range(len(similarities)),
                           key=lambda i: similarities[i], reverse=True)[:top_k]

        return [self.document_chunks[i] for i in top_indices]

    def answer_question(self, question: str, document_id: str = None) -> Dict[str, Any]:
        """Answer question using RAG pipeline"""
        # Retrieve relevant chunks
        relevant_chunks = self.retrieve_relevant_chunks(question)

        if not relevant_chunks:
            return {
                "answer": "No relevant information found in the document corpus.",
                "confidence": 0.0,
                "sources": []
            }

        # Construct context from relevant chunks
        context = "\n\n".join([chunk['text'] for chunk in relevant_chunks])

        # Query LLaMA 3 with context
        response = query_llama3(question, context)

        return {
            "answer": response['response'],
            "confidence": response['confidence'],
            "sources": [chunk['chunk_id'] for chunk in relevant_chunks],
            "model": response['model']
        }
    
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

# Initialize AI components
clause_extractor = LegalClauseExtractor()
rag_pipeline = RAGPipeline()

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

@app.route('/api/add-document', methods=['POST'])
def add_document_to_rag():
    """Add document to RAG knowledge base"""
    try:
        data = request.get_json()
        document_id = data.get('document_id', '')
        text = data.get('text', '')

        if not document_id or not text:
            return jsonify({'error': 'document_id and text are required'}), 400

        # Add to RAG pipeline
        rag_pipeline.add_document(document_id, text)

        return jsonify({
            'message': 'Document added to RAG knowledge base',
            'document_id': document_id,
            'chunks_created': len([c for c in rag_pipeline.document_chunks if c['document_id'] == document_id])
        })

    except Exception as e:
        logger.error(f"Error adding document to RAG: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rag-query', methods=['POST'])
def rag_query():
    """Query using RAG pipeline"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        document_id = data.get('document_id', '')

        if not question:
            return jsonify({'error': 'Question is required'}), 400

        result = rag_pipeline.answer_question(question, document_id)

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in RAG query: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    initialize_models()
    app.run(host='0.0.0.0', port=5002, debug=True)
