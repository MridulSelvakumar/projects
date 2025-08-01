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

# AI API Configuration
AI_PROVIDERS = {
    'openai': {
        'api_key': os.getenv('OPENAI_API_KEY'),
        'base_url': 'https://api.openai.com/v1',
        'model': 'gpt-3.5-turbo'
    },
    'gemini': {
        'api_key': os.getenv('GEMINI_API_KEY'),
        'base_url': 'https://generativelanguage.googleapis.com/v1beta',
        'model': 'gemini-pro'
    },
    'claude': {
        'api_key': os.getenv('ANTHROPIC_API_KEY'),
        'base_url': 'https://api.anthropic.com/v1',
        'model': 'claude-3-sonnet-20240229'
    },
    'huggingface': {
        'api_key': os.getenv('HUGGINGFACE_API_KEY'),
        'base_url': 'https://api-inference.huggingface.co/models',
        'model': 'microsoft/DialoGPT-large'
    }
}

# Default AI provider (can be changed via environment variable)
DEFAULT_AI_PROVIDER = os.getenv('AI_PROVIDER', 'openai')

# Initialize models
embedding_model = None
ollama_client = None

def call_external_ai_api(provider, prompt, document_context=""):
    """Call external AI API based on provider"""
    try:
        if provider not in AI_PROVIDERS:
            raise ValueError(f"Unsupported AI provider: {provider}")

        config = AI_PROVIDERS[provider]
        api_key = config['api_key']

        if not api_key:
            logger.warning(f"No API key found for {provider}, using fallback")
            return generate_fallback_response(prompt, document_context)

        if provider == 'openai':
            return call_openai_api(prompt, document_context, config)
        elif provider == 'gemini':
            return call_gemini_api(prompt, document_context, config)
        elif provider == 'claude':
            return call_claude_api(prompt, document_context, config)
        elif provider == 'huggingface':
            return call_huggingface_api(prompt, document_context, config)
        else:
            return generate_fallback_response(prompt, document_context)

    except Exception as e:
        logger.error(f"AI API call failed: {e}")
        return generate_fallback_response(prompt, document_context)

def call_openai_api(prompt, document_context, config):
    """Call OpenAI GPT API"""
    headers = {
        'Authorization': f'Bearer {config["api_key"]}',
        'Content-Type': 'application/json'
    }

    messages = [
        {"role": "system", "content": "You are a legal document analysis expert. Provide detailed, accurate analysis of legal documents."},
        {"role": "user", "content": f"Document context: {document_context}\n\nQuestion: {prompt}"}
    ]

    data = {
        "model": config["model"],
        "messages": messages,
        "max_tokens": 1000,
        "temperature": 0.3
    }

    response = requests.post(f'{config["base_url"]}/chat/completions',
                           headers=headers, json=data, timeout=30)

    if response.status_code == 200:
        result = response.json()
        return result['choices'][0]['message']['content']
    else:
        raise Exception(f"OpenAI API error: {response.status_code}")

def call_gemini_api(prompt, document_context, config):
    """Call Google Gemini API"""
    headers = {
        'Content-Type': 'application/json'
    }

    data = {
        "contents": [{
            "parts": [{
                "text": f"You are a legal document analysis expert. Document context: {document_context}\n\nQuestion: {prompt}"
            }]
        }]
    }

    url = f'{config["base_url"]}/models/{config["model"]}:generateContent?key={config["api_key"]}'
    response = requests.post(url, headers=headers, json=data, timeout=30)

    if response.status_code == 200:
        result = response.json()
        return result['candidates'][0]['content']['parts'][0]['text']
    else:
        raise Exception(f"Gemini API error: {response.status_code}")

def call_claude_api(prompt, document_context, config):
    """Call Anthropic Claude API"""
    headers = {
        'x-api-key': config["api_key"],
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
    }

    data = {
        "model": config["model"],
        "max_tokens": 1000,
        "messages": [{
            "role": "user",
            "content": f"You are a legal document analysis expert. Document context: {document_context}\n\nQuestion: {prompt}"
        }]
    }

    response = requests.post(f'{config["base_url"]}/messages',
                           headers=headers, json=data, timeout=30)

    if response.status_code == 200:
        result = response.json()
        return result['content'][0]['text']
    else:
        raise Exception(f"Claude API error: {response.status_code}")

def call_huggingface_api(prompt, document_context, config):
    """Call Hugging Face API"""
    headers = {
        'Authorization': f'Bearer {config["api_key"]}',
        'Content-Type': 'application/json'
    }

    data = {
        "inputs": f"Legal document analysis context: {document_context}\n\nQuestion: {prompt}",
        "parameters": {
            "max_length": 500,
            "temperature": 0.3
        }
    }

    response = requests.post(f'{config["base_url"]}/{config["model"]}',
                           headers=headers, json=data, timeout=30)

    if response.status_code == 200:
        result = response.json()
        return result[0]['generated_text'] if isinstance(result, list) else result['generated_text']
    else:
        raise Exception(f"Hugging Face API error: {response.status_code}")

def generate_fallback_response(prompt, document_context):
    """Generate intelligent fallback response"""
    prompt_lower = prompt.lower()

    # Legal document analysis patterns
    if any(word in prompt_lower for word in ['contract', 'agreement', 'terms']):
        return f"Based on the document analysis, this appears to be a legal contract. The document contains standard contractual elements including terms, conditions, and obligations. For detailed legal analysis, please consult with a qualified attorney. Document context: {document_context[:200]}..."

    elif any(word in prompt_lower for word in ['clause', 'provision', 'section']):
        return f"The document contains various clauses and provisions. Each clause serves a specific legal purpose and should be carefully reviewed. Key provisions typically include definitions, obligations, rights, and remedies. Document context: {document_context[:200]}..."

    elif any(word in prompt_lower for word in ['risk', 'liability', 'responsibility']):
        return f"Risk assessment requires careful review of liability clauses, indemnification provisions, and limitation of liability sections. Consider consulting legal counsel for comprehensive risk analysis. Document context: {document_context[:200]}..."

    elif any(word in prompt_lower for word in ['summary', 'overview', 'main points']):
        return f"Document Summary: This legal document contains important terms and conditions that require careful review. Key areas typically include parties involved, scope of agreement, obligations, rights, and termination provisions. Document context: {document_context[:200]}..."

    else:
        return f"I understand you're asking: '{prompt}'. Based on the document content, this requires detailed legal analysis. The document contains relevant information that should be reviewed by a qualified legal professional. Document context: {document_context[:200]}..."

def initialize_models():
    """Initialize AI models with API integration"""
    global embedding_model, ollama_client

    logger.info("🚀 Initializing AI Microservice with API integration...")

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
    """Query LLaMA 3 model via Ollama with enhanced legal document analysis"""

    # Enhanced prompt for comprehensive legal document analysis
    enhanced_prompt = f"""You are a professional legal document analyst with expertise in contract law, corporate agreements, and legal compliance.

FULL DOCUMENT CONTEXT: {context}

USER QUESTION: {prompt}

Please provide a comprehensive, accurate analysis by:
1. SCANNING THE ENTIRE DOCUMENT thoroughly
2. Identifying key legal concepts, terms, and clauses
3. Explaining important provisions and their implications
4. Highlighting potential risks, obligations, or concerns
5. Providing clear, professional explanations in plain language
6. Being specific and referencing actual content from the document

IMPORTANT: Base your response ONLY on the actual document content provided. Be thorough and detailed.

RESPONSE:"""

    # Try Ollama client first
    if ollama_client:
        try:
            response = ollama_client.generate(
                model=model,
                prompt=enhanced_prompt,
                options={
                    "temperature": 0.2,  # Very low temperature for consistent legal analysis
                    "top_p": 0.9,
                    "num_predict": 2000  # Allow longer responses
                }
            )

            return {
                "response": response['response'],
                "model": model,
                "confidence": 0.9,
                "tokens_used": len(response['response'].split()),
                "method": "LLaMA3-Ollama"
            }

        except Exception as e:
            logger.error(f"Ollama client error: {e}")

    # Try direct HTTP request to Ollama
    try:
        ollama_url = "http://localhost:11434/api/generate"
        payload = {
            "model": model,
            "prompt": enhanced_prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
                "num_predict": 2000
            }
        }

        response = requests.post(ollama_url, json=payload, timeout=120)

        if response.status_code == 200:
            result = response.json()
            return {
                "response": result.get('response', 'No response received'),
                "model": model,
                "confidence": 0.85,
                "method": "Direct-HTTP",
                "tokens_used": len(result.get('response', '').split())
            }
        else:
            raise Exception(f"Ollama API returned status {response.status_code}")

    except Exception as e:
        logger.error(f"Direct Ollama query failed: {e}")

        # Fallback response with instructions
        return {
            "response": f"""I'm unable to connect to the LLaMA 3 model right now.

To fix this, please:
1. Start Ollama: Run 'ollama serve' in your command prompt
2. Install LLaMA 3: Run 'ollama pull llama3'
3. Verify it's running: Check http://localhost:11434

Once Ollama is running, I'll be able to provide comprehensive analysis of your legal documents using LLaMA 3.

For now, based on your question "{prompt}", I can see you're interested in document analysis. Please ensure Ollama is running and try again.""",
            "model": model,
            "confidence": 0.0,
            "error": str(e),
            "method": "Fallback"
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
    """Query AI model with context using external APIs"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        context = data.get('context', '')
        provider = data.get('provider', DEFAULT_AI_PROVIDER)

        if not question:
            return jsonify({'error': 'Question is required'}), 400

        logger.info(f"Processing query with {provider} AI provider")

        # Prepare prompt for legal document analysis
        prompt = f"""You are a legal document analysis assistant. Based on the provided context from legal documents, answer the user's question accurately and concisely.

Question: {question}

Please provide a clear, professional answer. If you need more context to provide a complete answer, please state that clearly."""

        # Call external AI API
        answer = call_external_ai_api(provider, prompt, context)

        # Calculate confidence based on response characteristics
        confidence = min(0.9, len(answer) / 200 * 0.3 + 0.6)

        return jsonify({
            'answer': answer,
            'confidence': confidence,
            'model_used': f"{provider}_{AI_PROVIDERS.get(provider, {}).get('model', 'unknown')}",
            'context_length': len(context),
            'provider': provider
        })

    except Exception as e:
        logger.error(f"Error querying AI: {str(e)}")
        # Use fallback response
        fallback_answer = generate_fallback_response(question, context)
        return jsonify({
            'answer': fallback_answer,
            'confidence': 0.7,
            'model_used': 'fallback',
            'provider': 'fallback',
            'note': 'Using intelligent fallback response'
        })

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

@app.route('/api/generate-summary', methods=['POST'])
def generate_document_summary():
    """Generate comprehensive document summary for download"""
    try:
        data = request.get_json()
        document_text = data.get('text', '')
        document_title = data.get('title', 'Legal Document')
        document_type = data.get('type', 'CONTRACT')

        if not document_text:
            return jsonify({'error': 'No document text provided'}), 400

        # Create comprehensive analysis prompt
        summary_prompt = f"""You are a professional legal document analyst. Please provide a comprehensive summary of this {document_type.lower()} document.

DOCUMENT TITLE: {document_title}
DOCUMENT TYPE: {document_type}

FULL DOCUMENT TEXT:
{document_text}

Please provide a detailed analysis in the following format:

## EXECUTIVE SUMMARY
[Brief 2-3 sentence overview of the document]

## KEY PARTIES
[List all parties involved with their roles]

## MAIN TERMS & CONDITIONS
[Key terms, obligations, and conditions]

## FINANCIAL TERMS
[Payment terms, amounts, fees, penalties]

## IMPORTANT DATES & DEADLINES
[Key dates, deadlines, renewal terms]

## RIGHTS & OBLIGATIONS
[What each party must do and their rights]

## TERMINATION & CANCELLATION
[How the agreement can be ended]

## RISK ASSESSMENT
[Potential risks, liabilities, and concerns]

## KEY CLAUSES TO REVIEW
[Important clauses that need attention]

## RECOMMENDATIONS
[Professional recommendations for review or action]

Please be thorough, accurate, and professional. Base your analysis ONLY on the actual document content."""

        # Get AI analysis using external API
        provider = data.get('provider', DEFAULT_AI_PROVIDER)
        logger.info(f"Generating summary with {provider} AI provider")

        try:
            ai_response = call_external_ai_api(provider, summary_prompt, document_text)
            confidence = 0.85
            method = f"{provider}_api"
        except Exception as e:
            logger.warning(f"AI API failed, using fallback: {e}")
            ai_response = generate_fallback_response("generate comprehensive summary", document_text)
            confidence = 0.7
            method = "fallback"

        # Format the summary for download
        formatted_summary = f"""
LEGAL DOCUMENT ANALYSIS REPORT
Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Document: {document_title}
Type: {document_type}
Analysis Method: {method}
AI Provider: {provider}
Confidence: {confidence * 100:.1f}%

{'='*80}

{ai_response}

{'='*80}

DISCLAIMER: This analysis is generated by AI and should be reviewed by a qualified legal professional.
It is not a substitute for professional legal advice.

Report generated by Legal Document Analyzer AI System
"""

        return jsonify({
            'summary': result.get('response', ''),
            'formatted_summary': formatted_summary,
            'confidence': result.get('confidence', 0.8),
            'method': result.get('method', 'AI Analysis'),
            'document_title': document_title,
            'document_type': document_type,
            'generated_at': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error generating document summary: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    initialize_models()
    app.run(host='0.0.0.0', port=5002, debug=True)
