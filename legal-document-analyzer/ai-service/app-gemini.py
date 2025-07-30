from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
import google.generativeai as genai
from typing import Dict, Any
import json
import re
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
gemini_model = None

def initialize_gemini():
    """Initialize Gemini AI model"""
    global gemini_model
    
    logger.info("🚀 Initializing Gemini AI Service...")
    
    # Get API key from environment
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.error("❌ GEMINI_API_KEY not found in environment variables!")
        logger.info("Please set your Gemini API key: export GEMINI_API_KEY='your-api-key-here'")
        return False
    
    try:
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Initialize the model
        gemini_model = genai.GenerativeModel('gemini-pro')
        
        # Test the connection
        test_response = gemini_model.generate_content("Hello, are you working?")
        logger.info(f"✅ Gemini AI initialized successfully! Test response: {test_response.text[:50]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Gemini: {e}")
        return False

def query_gemini(prompt: str, context: str = "") -> Dict[str, Any]:
    """Query Gemini AI model"""
    if not gemini_model:
        return {
            "response": "Gemini AI is not available. Please check your API key configuration.",
            "model": "gemini-unavailable",
            "confidence": 0.0,
            "error": "Gemini not initialized"
        }
    
    try:
        # Construct the full prompt for legal document analysis
        full_prompt = f"""You are a professional legal document analysis assistant. 

Context from legal documents:
{context}

User Question: {prompt}

Please provide a detailed, accurate legal analysis based on the context provided. If the context doesn't contain enough information to answer the question, please state that clearly. Focus on:
- Key legal concepts and clauses
- Potential risks or implications
- Relevant legal considerations
- Clear, professional language

Response:"""

        # Generate response
        response = gemini_model.generate_content(full_prompt)
        
        # Calculate confidence based on response quality
        confidence = 0.9 if len(response.text) > 100 else 0.7
        
        return {
            "response": response.text,
            "model": "gemini-pro",
            "confidence": confidence,
            "tokens_used": len(response.text.split())
        }
        
    except Exception as e:
        logger.error(f"Error querying Gemini: {e}")
        return {
            "response": f"Error processing with Gemini AI: {str(e)}",
            "model": "gemini-pro",
            "confidence": 0.0,
            "error": str(e)
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    gemini_status = gemini_model is not None
    return jsonify({
        'status': 'healthy',
        'gemini_available': gemini_status,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/query', methods=['POST'])
def query_ai():
    """Query Gemini AI with context"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        context = data.get('context', '')
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        logger.info(f"Processing question: {question[:100]}...")
        
        # Query Gemini
        result = query_gemini(question, context)
        
        return jsonify({
            'answer': result['response'],
            'confidence': result['confidence'],
            'model_used': result['model'],
            'context_length': len(context),
            'processing_time': 1.5
        })
        
    except Exception as e:
        logger.error(f"Error in query endpoint: {str(e)}")
        return jsonify({
            'answer': 'I apologize, but I encountered an error while processing your question. Please try again.',
            'confidence': 0.0,
            'error': str(e)
        }), 500

@app.route('/api/analyze-document', methods=['POST'])
def analyze_document():
    """Analyze document content with Gemini"""
    try:
        data = request.get_json()
        document_text = data.get('text', '')
        analysis_type = data.get('type', 'general')
        
        if not document_text:
            return jsonify({'error': 'Document text is required'}), 400
        
        # Create analysis prompt based on type
        if analysis_type == 'risk':
            prompt = "Analyze this legal document for potential risks, liabilities, and areas of concern:"
        elif analysis_type == 'clauses':
            prompt = "Extract and summarize the key clauses and provisions from this legal document:"
        else:
            prompt = "Provide a comprehensive analysis of this legal document:"
        
        result = query_gemini(prompt, document_text)
        
        return jsonify({
            'analysis': result['response'],
            'confidence': result['confidence'],
            'analysis_type': analysis_type,
            'model_used': result['model']
        })
        
    except Exception as e:
        logger.error(f"Error in document analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/extract-clauses', methods=['POST'])
def extract_clauses():
    """Extract specific clauses from document"""
    try:
        data = request.get_json()
        document_text = data.get('text', '')
        clause_types = data.get('clause_types', ['confidentiality', 'termination', 'liability'])
        
        if not document_text:
            return jsonify({'error': 'Document text is required'}), 400
        
        prompt = f"""Extract and analyze the following types of clauses from this legal document:
{', '.join(clause_types)}

For each clause type found, provide:
1. The exact text of the clause
2. A summary of what it means
3. Any potential risks or important considerations

Document text:"""
        
        result = query_gemini(prompt, document_text)
        
        return jsonify({
            'extracted_clauses': result['response'],
            'confidence': result['confidence'],
            'clause_types_requested': clause_types,
            'model_used': result['model']
        })
        
    except Exception as e:
        logger.error(f"Error in clause extraction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-gemini', methods=['GET'])
def test_gemini():
    """Test Gemini connection"""
    try:
        if not gemini_model:
            return jsonify({
                'status': 'error',
                'message': 'Gemini not initialized. Check your API key.'
            }), 500
        
        test_result = query_gemini("What is a legal contract?", "")
        
        return jsonify({
            'status': 'success',
            'test_response': test_result['response'][:200] + "...",
            'model': test_result['model'],
            'confidence': test_result['confidence']
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    success = initialize_gemini()
    if not success:
        logger.error("Failed to initialize Gemini. Please check your API key.")
        logger.info("Set your API key with: export GEMINI_API_KEY='your-api-key-here'")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
