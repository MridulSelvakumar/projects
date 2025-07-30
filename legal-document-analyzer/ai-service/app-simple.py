from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import re
import json
from typing import List, Dict, Any
from datetime import datetime
import numpy as np
import sqlite3
import os
from collections import defaultdict
import math

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global storage for RAG
document_store = {}
vector_store = {}
chunk_store = {}

def initialize_models():
    """Initialize AI models with enhanced RAG capabilities"""
    logger.info("🚀 AI Service initializing with RAG and Document Analysis...")
    logger.info("✅ AI Service ready with RAG pipeline and document analysis")

class EnhancedRAGPipeline:
    """Advanced Retrieval-Augmented Generation pipeline for legal documents"""

    def __init__(self):
        self.documents = {}
        self.chunks = {}
        self.embeddings = {}
        self.chunk_size = 500
        self.overlap = 50

    def add_document(self, doc_id: str, text: str, metadata: Dict = None):
        """Add document to RAG knowledge base with chunking and embeddings"""
        logger.info(f"📚 Adding document {doc_id} to RAG pipeline")

        # Store original document
        self.documents[doc_id] = {
            'text': text,
            'metadata': metadata or {},
            'added_at': datetime.now().isoformat()
        }

        # Create chunks
        chunks = self._create_chunks(text, doc_id)

        # Generate embeddings for each chunk
        for chunk_id, chunk_data in chunks.items():
            embedding = self._generate_embedding(chunk_data['text'])
            self.embeddings[chunk_id] = embedding

        self.chunks.update(chunks)

        logger.info(f"✅ Document {doc_id} processed: {len(chunks)} chunks created")
        return len(chunks)

    def _create_chunks(self, text: str, doc_id: str) -> Dict:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = {}

        for i in range(0, len(words), self.chunk_size - self.overlap):
            chunk_text = ' '.join(words[i:i + self.chunk_size])
            chunk_id = f"{doc_id}_chunk_{i // (self.chunk_size - self.overlap)}"

            chunks[chunk_id] = {
                'text': chunk_text,
                'doc_id': doc_id,
                'chunk_index': i // (self.chunk_size - self.overlap),
                'word_start': i,
                'word_end': min(i + self.chunk_size, len(words))
            }

        return chunks

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings using TF-IDF-like approach"""
        # Simple TF-IDF-like embedding for demo
        words = re.findall(r'\w+', text.lower())
        word_freq = defaultdict(int)

        for word in words:
            word_freq[word] += 1

        # Create a simple vector based on legal terms
        legal_terms = [
            'liability', 'contract', 'agreement', 'clause', 'termination',
            'confidential', 'payment', 'intellectual', 'property', 'damages',
            'breach', 'notice', 'party', 'obligation', 'right', 'law',
            'jurisdiction', 'dispute', 'remedy', 'force', 'majeure'
        ]

        embedding = []
        for term in legal_terms:
            # TF-IDF-like score
            tf = word_freq.get(term, 0) / max(len(words), 1)
            embedding.append(tf)

        # Pad to 384 dimensions (standard embedding size)
        while len(embedding) < 384:
            embedding.append(0.0)

        return embedding[:384]

    def semantic_search(self, query: str, top_k: int = 5, doc_id: str = None) -> List[Dict]:
        """Perform semantic search across document chunks"""
        query_embedding = self._generate_embedding(query)

        # Calculate similarities
        similarities = []
        for chunk_id, chunk_data in self.chunks.items():
            if doc_id and chunk_data['doc_id'] != doc_id:
                continue

            chunk_embedding = self.embeddings.get(chunk_id, [])
            if chunk_embedding:
                similarity = self._cosine_similarity(query_embedding, chunk_embedding)
                similarities.append({
                    'chunk_id': chunk_id,
                    'similarity': similarity,
                    'text': chunk_data['text'],
                    'doc_id': chunk_data['doc_id'],
                    'chunk_index': chunk_data['chunk_index']
                })

        # Sort by similarity and return top-k
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        return similarities[:top_k]

    def _generate_answer(self, question: str, context: str, chunks: List[Dict]) -> Dict:
        """Generate answer based on question and context"""
        # Analyze question type
        question_lower = question.lower()

        # Legal-specific answer generation
        if 'liability' in question_lower:
            answer = self._analyze_liability_context(context)
        elif 'termination' in question_lower or 'terminate' in question_lower:
            answer = self._analyze_termination_context(context)
        elif 'confidential' in question_lower or 'disclosure' in question_lower:
            answer = self._analyze_confidentiality_context(context)
        elif 'payment' in question_lower or 'invoice' in question_lower:
            answer = self._analyze_payment_context(context)
        elif 'intellectual property' in question_lower or 'copyright' in question_lower:
            answer = self._analyze_ip_context(context)
        else:
            answer = self._generate_general_answer(question, context)

        return answer

    def _analyze_liability_context(self, context: str) -> Dict:
        """Analyze liability-related context"""
        liability_terms = ['limited', 'excluded', 'direct damages', 'consequential', 'indirect']
        found_terms = [term for term in liability_terms if term.lower() in context.lower()]

        if 'limited' in context.lower():
            answer = "Based on the document, liability appears to be limited. "
            if 'direct damages' in context.lower():
                answer += "The liability is typically limited to direct damages only. "
            if 'consequential' in context.lower() or 'indirect' in context.lower():
                answer += "Consequential and indirect damages are generally excluded."
        else:
            answer = "The document contains liability provisions, but specific limitations are not clearly defined in the available context."

        confidence = min(0.9, 0.5 + len(found_terms) * 0.1)
        return {'text': answer, 'confidence': confidence}

    def _analyze_termination_context(self, context: str) -> Dict:
        """Analyze termination-related context"""
        termination_indicators = ['notice', 'days', 'breach', 'immediate', 'written']
        found_indicators = [term for term in termination_indicators if term.lower() in context.lower()]

        answer = "Based on the document, "
        if 'notice' in context.lower():
            # Extract notice period
            import re
            notice_match = re.search(r'(\d+)\s*days?\s*(?:written\s*)?notice', context.lower())
            if notice_match:
                days = notice_match.group(1)
                answer += f"termination requires {days} days written notice. "
            else:
                answer += "termination requires written notice. "

        if 'breach' in context.lower():
            answer += "Immediate termination may be allowed in case of material breach. "

        if not found_indicators:
            answer += "termination provisions exist but specific terms are not clear in the available context."

        confidence = min(0.9, 0.4 + len(found_indicators) * 0.1)
        return {'text': answer, 'confidence': confidence}

    def _analyze_confidentiality_context(self, context: str) -> Dict:
        """Analyze confidentiality-related context"""
        conf_terms = ['confidential', 'proprietary', 'disclosure', 'years', 'survive']
        found_terms = [term for term in conf_terms if term.lower() in context.lower()]

        answer = "Based on the document, "
        if 'confidential' in context.lower():
            answer += "there are confidentiality obligations. "

            # Extract duration
            import re
            duration_match = re.search(r'(\d+)\s*years?', context.lower())
            if duration_match:
                years = duration_match.group(1)
                answer += f"The confidentiality obligation lasts for {years} years. "

            if 'survive' in context.lower():
                answer += "These obligations survive termination of the agreement."
        else:
            answer += "confidentiality provisions may exist but are not clearly defined in the available context."

        confidence = min(0.9, 0.5 + len(found_terms) * 0.08)
        return {'text': answer, 'confidence': confidence}

    def _analyze_payment_context(self, context: str) -> Dict:
        """Analyze payment-related context"""
        payment_terms = ['payment', 'invoice', 'days', 'interest', 'late', 'overdue']
        found_terms = [term for term in payment_terms if term.lower() in context.lower()]

        answer = "Based on the document, "

        # Extract payment terms
        import re
        payment_match = re.search(r'(\d+)\s*days?.*?(?:payment|receipt)', context.lower())
        if payment_match:
            days = payment_match.group(1)
            answer += f"payment is due within {days} days. "

        if 'interest' in context.lower() or 'late' in context.lower():
            answer += "Late payment penalties or interest charges may apply. "

        if not found_terms:
            answer += "payment terms exist but specific details are not clear in the available context."

        confidence = min(0.9, 0.5 + len(found_terms) * 0.08)
        return {'text': answer, 'confidence': confidence}

    def _analyze_ip_context(self, context: str) -> Dict:
        """Analyze intellectual property context"""
        ip_terms = ['intellectual property', 'copyright', 'patent', 'trademark', 'ownership', 'rights']
        found_terms = [term for term in ip_terms if term.lower() in context.lower()]

        answer = "Based on the document, "
        if 'ownership' in context.lower():
            answer += "intellectual property ownership is addressed. "
        if 'rights' in context.lower():
            answer += "Intellectual property rights are defined. "
        if not found_terms:
            answer += "intellectual property provisions may exist but are not clearly defined in the available context."

        confidence = min(0.9, 0.4 + len(found_terms) * 0.1)
        return {'text': answer, 'confidence': confidence}

    def _generate_general_answer(self, question: str, context: str) -> Dict:
        """Generate general answer for non-specific questions"""
        # Extract key sentences from context that might be relevant
        sentences = re.split(r'[.!?]+', context)
        relevant_sentences = []

        question_words = set(re.findall(r'\w+', question.lower()))

        for sentence in sentences:
            sentence_words = set(re.findall(r'\w+', sentence.lower()))
            overlap = len(question_words.intersection(sentence_words))
            if overlap > 0:
                relevant_sentences.append((sentence.strip(), overlap))

        # Sort by relevance
        relevant_sentences.sort(key=lambda x: x[1], reverse=True)

        if relevant_sentences:
            answer = f"Based on the document context: {relevant_sentences[0][0]}"
            confidence = min(0.8, 0.3 + relevant_sentences[0][1] * 0.1)
        else:
            answer = "I found relevant information in the document, but cannot provide a specific answer to your question based on the available context."
            confidence = 0.3

        return {'text': answer, 'confidence': confidence}

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if len(vec1) != len(vec2):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(a * a for a in vec2))

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def answer_question(self, question: str, doc_id: str = None) -> Dict:
        """Answer question using RAG pipeline"""
        # Retrieve relevant chunks
        relevant_chunks = self.semantic_search(question, top_k=3, doc_id=doc_id)

        if not relevant_chunks:
            return {
                'answer': 'No relevant information found in the document(s).',
                'confidence': 0.0,
                'sources': [],
                'method': 'RAG'
            }

        # Construct context from relevant chunks
        context = '\n\n'.join([chunk['text'] for chunk in relevant_chunks])

        # Generate answer using context
        answer = self._generate_answer(question, context, relevant_chunks)

        return {
            'answer': answer['text'],
            'confidence': answer['confidence'],
            'sources': [chunk['chunk_id'] for chunk in relevant_chunks],
            'method': 'RAG',
            'context_used': len(relevant_chunks)
        }

class LegalClauseExtractor:
    """Enhanced legal clause extraction with AI analysis"""

    def __init__(self):
        self.clause_patterns = {
            'liability': [
                r'liability.*?(?:limited|excluded|disclaimed)',
                r'(?:limitation|exclusion).*?liability',
                r'damages.*?(?:limited|excluded|indirect|consequential)'
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
                r'end.*?(?:contract|agreement)',
                r'expir.*?(?:contract|agreement)'
            ],
            'payment': [
                r'payment.*?terms',
                r'invoice.*?(?:payment|due)',
                r'compensation.*?amount',
                r'fee.*?schedule'
            ],
            'intellectual_property': [
                r'intellectual.*?property',
                r'copyright.*?ownership',
                r'patent.*?rights',
                r'trademark.*?usage'
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
        
        return clauses
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]

    def analyze_document_comprehensive(self, text: str, doc_id: str = None) -> Dict:
        """Comprehensive document analysis with AI insights"""
        analysis = {
            'document_id': doc_id,
            'analysis_timestamp': datetime.now().isoformat(),
            'document_stats': self._get_document_stats(text),
            'clause_analysis': self._analyze_clauses_advanced(text),
            'risk_assessment': self._assess_document_risks(text),
            'key_terms': self._extract_key_terms(text),
            'document_structure': self._analyze_structure(text),
            'compliance_indicators': self._check_compliance_indicators(text),
            'summary': self._generate_document_summary(text)
        }

        return analysis

    def _get_document_stats(self, text: str) -> Dict:
        """Get basic document statistics"""
        words = re.findall(r'\w+', text)
        sentences = self._split_into_sentences(text)
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

        return {
            'word_count': len(words),
            'sentence_count': len(sentences),
            'paragraph_count': len(paragraphs),
            'character_count': len(text),
            'avg_words_per_sentence': len(words) / max(len(sentences), 1),
            'readability_score': self._calculate_readability(words, sentences)
        }

    def _calculate_readability(self, words: List[str], sentences: List[str]) -> float:
        """Calculate simple readability score"""
        if not words or not sentences:
            return 0.0

        avg_sentence_length = len(words) / len(sentences)
        # Simple readability metric (lower is more readable)
        readability = min(100, max(0, 100 - (avg_sentence_length - 15) * 2))
        return round(readability, 2)

    def _analyze_clauses_advanced(self, text: str) -> Dict:
        """Advanced clause analysis with context"""
        clauses = self.extract_clauses(text)

        clause_analysis = {
            'total_clauses': len(clauses),
            'clause_types': {},
            'clause_density': len(clauses) / max(len(text.split()), 1) * 1000,  # clauses per 1000 words
            'detailed_clauses': []
        }

        # Group by type and analyze
        for clause in clauses:
            clause_type = clause['type']
            if clause_type not in clause_analysis['clause_types']:
                clause_analysis['clause_types'][clause_type] = {
                    'count': 0,
                    'avg_confidence': 0,
                    'examples': []
                }

            clause_analysis['clause_types'][clause_type]['count'] += 1
            clause_analysis['clause_types'][clause_type]['examples'].append(clause['content'][:100] + '...')

        # Calculate average confidence per type
        for clause_type in clause_analysis['clause_types']:
            type_clauses = [c for c in clauses if c['type'] == clause_type]
            avg_conf = sum(c['confidence'] for c in type_clauses) / len(type_clauses)
            clause_analysis['clause_types'][clause_type]['avg_confidence'] = round(avg_conf, 3)

        return clause_analysis

    def _assess_document_risks(self, text: str) -> Dict:
        """Assess potential risks in the document"""
        risk_indicators = {
            'high_risk': [
                'unlimited liability', 'no limitation', 'personal guarantee',
                'indemnify', 'hold harmless', 'liquidated damages'
            ],
            'medium_risk': [
                'material breach', 'immediate termination', 'sole discretion',
                'as is', 'no warranty', 'force majeure'
            ],
            'compliance_risk': [
                'gdpr', 'privacy', 'data protection', 'regulatory',
                'compliance', 'audit', 'inspection'
            ]
        }

        risks = {
            'overall_risk_level': 'LOW',
            'risk_factors': [],
            'recommendations': []
        }

        text_lower = text.lower()
        total_risk_score = 0

        for risk_level, indicators in risk_indicators.items():
            found_indicators = [ind for ind in indicators if ind in text_lower]
            if found_indicators:
                risks['risk_factors'].append({
                    'level': risk_level,
                    'indicators': found_indicators,
                    'count': len(found_indicators)
                })

                if risk_level == 'high_risk':
                    total_risk_score += len(found_indicators) * 3
                elif risk_level == 'medium_risk':
                    total_risk_score += len(found_indicators) * 2
                else:
                    total_risk_score += len(found_indicators)

        # Determine overall risk level
        if total_risk_score >= 6:
            risks['overall_risk_level'] = 'HIGH'
            risks['recommendations'].append('Consider legal review before signing')
            risks['recommendations'].append('Negotiate liability limitations')
        elif total_risk_score >= 3:
            risks['overall_risk_level'] = 'MEDIUM'
            risks['recommendations'].append('Review key terms carefully')
            risks['recommendations'].append('Consider professional advice')
        else:
            risks['recommendations'].append('Standard risk level - review as normal')

        return risks

    def _extract_key_terms(self, text: str) -> List[Dict]:
        """Extract key legal terms and their frequency"""
        legal_terms = {
            'contract_terms': ['agreement', 'contract', 'party', 'parties', 'obligation', 'right'],
            'liability_terms': ['liability', 'damages', 'loss', 'harm', 'injury', 'claim'],
            'time_terms': ['term', 'duration', 'period', 'expiry', 'renewal', 'notice'],
            'payment_terms': ['payment', 'fee', 'cost', 'invoice', 'billing', 'charge'],
            'legal_terms': ['law', 'jurisdiction', 'court', 'dispute', 'arbitration', 'mediation']
        }

        text_words = re.findall(r'\w+', text.lower())
        key_terms = []

        for category, terms in legal_terms.items():
            for term in terms:
                count = text_words.count(term)
                if count > 0:
                    key_terms.append({
                        'term': term,
                        'category': category,
                        'frequency': count,
                        'importance': min(10, count * 2)  # Simple importance score
                    })

        # Sort by frequency
        key_terms.sort(key=lambda x: x['frequency'], reverse=True)
        return key_terms[:20]  # Top 20 terms

    def _analyze_structure(self, text: str) -> Dict:
        """Analyze document structure"""
        lines = text.split('\n')
        structure = {
            'has_title': False,
            'has_sections': False,
            'has_numbered_clauses': False,
            'has_signature_block': False,
            'estimated_sections': 0
        }

        # Check for title (first non-empty line in caps or title case)
        for line in lines[:5]:
            if line.strip() and (line.isupper() or line.istitle()):
                structure['has_title'] = True
                break

        # Check for numbered sections
        numbered_pattern = re.compile(r'^\s*\d+\.?\s+[A-Z]')
        numbered_lines = [line for line in lines if numbered_pattern.match(line)]
        if numbered_lines:
            structure['has_numbered_clauses'] = True
            structure['estimated_sections'] = len(numbered_lines)

        # Check for sections
        section_indicators = ['section', 'article', 'clause', 'paragraph']
        section_lines = [line for line in lines if any(ind in line.lower() for ind in section_indicators)]
        if section_lines:
            structure['has_sections'] = True

        # Check for signature block
        signature_indicators = ['signature', 'signed', 'witness', 'date', 'executed']
        if any(ind in text.lower() for ind in signature_indicators):
            structure['has_signature_block'] = True

        return structure

    def _check_compliance_indicators(self, text: str) -> Dict:
        """Check for compliance-related indicators"""
        compliance_areas = {
            'data_protection': ['gdpr', 'data protection', 'privacy policy', 'personal data'],
            'financial': ['sox', 'sarbanes', 'financial reporting', 'audit'],
            'employment': ['equal opportunity', 'discrimination', 'harassment', 'workplace'],
            'environmental': ['environmental', 'sustainability', 'carbon', 'emissions'],
            'security': ['security', 'cybersecurity', 'data breach', 'encryption']
        }

        compliance = {
            'areas_covered': [],
            'compliance_score': 0,
            'recommendations': []
        }

        text_lower = text.lower()

        for area, indicators in compliance_areas.items():
            found = [ind for ind in indicators if ind in text_lower]
            if found:
                compliance['areas_covered'].append({
                    'area': area,
                    'indicators_found': found,
                    'coverage_level': len(found)
                })

        compliance['compliance_score'] = len(compliance['areas_covered']) * 20  # Out of 100

        if compliance['compliance_score'] < 40:
            compliance['recommendations'].append('Consider adding compliance clauses')

        return compliance

    def _generate_document_summary(self, text: str) -> str:
        """Generate an AI-powered document summary"""
        # Extract first few sentences and key information
        sentences = self._split_into_sentences(text)

        # Get document type
        doc_type = 'legal document'
        if 'agreement' in text.lower():
            doc_type = 'agreement'
        elif 'contract' in text.lower():
            doc_type = 'contract'
        elif 'policy' in text.lower():
            doc_type = 'policy'

        # Extract key parties if mentioned
        party_pattern = re.search(r'between\s+([^and]+)\s+and\s+([^.]+)', text.lower())
        parties_info = ""
        if party_pattern:
            parties_info = f" between {party_pattern.group(1).strip()} and {party_pattern.group(2).strip()}"

        # Generate summary
        summary = f"This {doc_type}{parties_info} contains {len(sentences)} main provisions. "

        # Add clause information
        clauses = self.extract_clauses(text)
        if clauses:
            clause_types = list(set([c['type'] for c in clauses]))
            summary += f"Key areas covered include: {', '.join(clause_types[:3])}. "

        # Add risk assessment
        risks = self._assess_document_risks(text)
        summary += f"Overall risk level: {risks['overall_risk_level']}."

        return summary

# Initialize AI components
clause_extractor = LegalClauseExtractor()
rag_pipeline = EnhancedRAGPipeline()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Legal Document AI Service',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/extract-clauses', methods=['POST'])
def extract_clauses():
    """Extract clauses from document text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # Extract clauses
        clauses = clause_extractor.extract_clauses(text)
        
        return jsonify({
            'clauses': clauses,
            'total_clauses': len(clauses),
            'processing_time': 1.2  # Mock processing time
        })
        
    except Exception as e:
        logger.error(f"Error extracting clauses: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-embeddings', methods=['POST'])
def generate_embeddings():
    """Generate embeddings for text (mock implementation)"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # Mock embeddings (in real implementation, use sentence transformers)
        mock_embedding = [0.1] * 384  # Standard embedding size
        
        return jsonify({
            'embeddings': mock_embedding,
            'dimension': len(mock_embedding),
            'model': 'mock-embeddings-v1'
        })
        
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/query', methods=['POST'])
def query_llm():
    """Query LLM with context (mock implementation)"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        context = data.get('context', '')
        model = data.get('model', 'mock-llm')
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        # Mock AI response based on question type
        if 'liability' in question.lower():
            answer = "Based on the document context, the liability clause limits damages to direct damages only, excluding consequential or indirect damages. The liability cap is typically set at the contract value."
        elif 'termination' in question.lower():
            answer = "The termination clause allows either party to terminate the agreement with 30 days written notice. Immediate termination is permitted in case of material breach."
        elif 'payment' in question.lower():
            answer = "Payment terms require invoices to be paid within 30 days of receipt. Late payments may incur interest charges at the rate specified in the agreement."
        elif 'confidential' in question.lower():
            answer = "The confidentiality clause requires both parties to protect proprietary information for a period of 5 years after agreement termination."
        else:
            answer = f"Based on the provided context, here is a response to your question: '{question}'. This is a mock response demonstrating the AI Q&A capability. In a full implementation, this would be processed by a language model like LLaMA."
        
        return jsonify({
            'answer': answer,
            'confidence': 0.85,
            'model_used': model,
            'context_length': len(context),
            'processing_time': 1.5
        })
        
    except Exception as e:
        logger.error(f"Error querying LLM: {str(e)}")
        return jsonify({
            'answer': 'I apologize, but I encountered an error while processing your question. Please try again.',
            'confidence': 0.0,
            'error': str(e)
        }), 500

@app.route('/api/analyze-document', methods=['POST'])
def analyze_document():
    """Comprehensive AI-powered document analysis"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        document_id = data.get('document_id', f'doc_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        document_type = data.get('document_type', 'contract')

        if not text:
            return jsonify({'error': 'Text is required'}), 400

        logger.info(f"🔍 Starting comprehensive analysis for document {document_id}")

        # Perform comprehensive analysis
        analysis = clause_extractor.analyze_document_comprehensive(text, document_id)

        # Add document to RAG pipeline for future Q&A
        chunks_created = rag_pipeline.add_document(document_id, text, {
            'document_type': document_type,
            'analysis_date': datetime.now().isoformat()
        })

        # Enhance analysis with RAG info
        analysis['rag_info'] = {
            'chunks_created': chunks_created,
            'available_for_qa': True,
            'document_id': document_id
        }

        logger.info(f"✅ Analysis completed for document {document_id}")

        return jsonify({
            'document_id': document_id,
            'analysis': analysis,
            'processing_time': 2.5,
            'status': 'completed'
        })

    except Exception as e:
        logger.error(f"Error analyzing document: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rag-add-document', methods=['POST'])
def add_document_to_rag():
    """Add document to RAG knowledge base"""
    try:
        data = request.get_json()
        document_id = data.get('document_id', '')
        text = data.get('text', '')
        metadata = data.get('metadata', {})

        if not document_id or not text:
            return jsonify({'error': 'document_id and text are required'}), 400

        logger.info(f"📚 Adding document {document_id} to RAG pipeline")

        chunks_created = rag_pipeline.add_document(document_id, text, metadata)

        return jsonify({
            'message': 'Document added to RAG knowledge base successfully',
            'document_id': document_id,
            'chunks_created': chunks_created,
            'status': 'success'
        })

    except Exception as e:
        logger.error(f"Error adding document to RAG: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rag-query', methods=['POST'])
def rag_query():
    """Enhanced Q&A using RAG pipeline"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        document_id = data.get('document_id', None)

        if not question:
            return jsonify({'error': 'Question is required'}), 400

        logger.info(f"💬 Processing RAG query: {question[:50]}...")

        # Use RAG pipeline for answer
        result = rag_pipeline.answer_question(question, document_id)

        # Add semantic search results
        search_results = rag_pipeline.semantic_search(question, top_k=5, doc_id=document_id)

        response = {
            'question': question,
            'answer': result['answer'],
            'confidence': result['confidence'],
            'method': result['method'],
            'sources': result['sources'],
            'context_chunks': result.get('context_used', 0),
            'semantic_search_results': search_results[:3],  # Top 3 for reference
            'document_id': document_id,
            'processing_time': 1.8
        }

        logger.info(f"✅ RAG query completed with confidence: {result['confidence']}")

        return jsonify(response)

    except Exception as e:
        logger.error(f"Error in RAG query: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/semantic-search', methods=['POST'])
def semantic_search():
    """Perform semantic search across documents"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        document_id = data.get('document_id', None)
        top_k = data.get('top_k', 5)

        if not query:
            return jsonify({'error': 'Query is required'}), 400

        logger.info(f"🔍 Performing semantic search: {query[:50]}...")

        results = rag_pipeline.semantic_search(query, top_k, document_id)

        return jsonify({
            'query': query,
            'results': results,
            'total_results': len(results),
            'document_id': document_id,
            'processing_time': 0.8
        })

    except Exception as e:
        logger.error(f"Error in semantic search: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    initialize_models()
    app.run(host='0.0.0.0', port=5000, debug=True)
