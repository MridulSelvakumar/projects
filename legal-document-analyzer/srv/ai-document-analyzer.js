const cds = require('@sap/cds');
const GeminiClient = require('./gemini-client');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

class AIDocumentAnalyzer {
  constructor() {
    // Initialize Gemini client with API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.geminiClient = new GeminiClient(apiKey);
    this.documentCache = new Map(); // Cache for processed documents
  }

  /**
   * Extract text from various document formats
   */
  async extractTextFromFile(fileBuffer, mimeType, fileName) {
    try {
      console.log(`Document: Extracting text from ${fileName} (${mimeType})`);
      
      let extractedText = '';
      
      switch (mimeType) {
        case 'application/pdf':
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text;
          break;
          
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          const docResult = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = docResult.value;
          break;
          
        case 'text/plain':
          extractedText = fileBuffer.toString('utf-8');
          break;
          
        default:
          // Try to extract as text
          extractedText = fileBuffer.toString('utf-8');
      }
      
      console.log(`Success: Extracted ${extractedText.length} characters from ${fileName}`);
      return extractedText;
      
    } catch (error) {
      console.error(`Error: Error extracting text from ${fileName}:`, error.message);
      throw new Error(`Failed to extract text from document: ${error.message}`);
    }
  }

  /**
   * Analyze document content using Gemini AI
   */
  async analyzeDocument(documentText, analysisType = 'comprehensive') {
    try {
      console.log(`AI: Starting ${analysisType} analysis of document (${documentText.length} chars)`);
      
      const prompts = {
        comprehensive: `
          Please provide a comprehensive analysis of this legal document. Include:
          
          1. **Document Type**: What type of legal document is this?
          2. **Key Parties**: Who are the main parties involved?
          3. **Main Purpose**: What is the primary purpose of this document?
          4. **Key Terms & Clauses**: List the most important clauses and terms
          5. **Obligations**: What are the key obligations for each party?
          6. **Important Dates**: Any critical dates, deadlines, or durations
          7. **Financial Terms**: Any monetary amounts, payment terms, or financial obligations
          8. **Risk Factors**: Potential risks or concerning clauses
          9. **Termination Conditions**: How can this agreement be terminated?
          10. **Summary**: A concise summary of the document
          
          Document Content:
          ${documentText}
        `,
        
        summary: `
          Please provide a concise summary of this legal document including:
          - Document type and purpose
          - Key parties involved
          - Main terms and obligations
          - Important dates and amounts
          
          Document Content:
          ${documentText}
        `,
        
        clauses: `
          Please extract and categorize all clauses from this legal document:
          - Liability clauses
          - Confidentiality clauses
          - Termination clauses
          - Payment clauses
          - Intellectual property clauses
          - Force majeure clauses
          - Dispute resolution clauses
          - Other important clauses
          
          For each clause, provide the clause text and explain its significance.
          
          Document Content:
          ${documentText}
        `,
        
        parties: `
          Please identify all parties mentioned in this legal document:
          - Primary parties (main signatories)
          - Secondary parties (witnesses, guarantors, etc.)
          - Third parties mentioned
          - Contact information if available
          - Roles and responsibilities of each party
          
          Document Content:
          ${documentText}
        `
      };
      
      const prompt = prompts[analysisType] || prompts.comprehensive;
      const result = await this.geminiClient.generateContent(prompt);
      
      console.log(`Success: ${analysisType} analysis completed`);
      return {
        analysisType,
        content: result.text,
        confidence: result.confidence,
        model: result.model,
        timestamp: new Date().toISOString(),
        documentLength: documentText.length
      };
      
    } catch (error) {
      console.error(`Error: Error analyzing document:`, error.message);
      throw new Error(`Document analysis failed: ${error.message}`);
    }
  }

  /**
   * Answer specific questions about the document
   */
  async answerQuestion(documentText, question, documentId = null) {
    try {
      console.log(`Question: Answering question about document: "${question}"`);
      
      // Check cache if documentId provided
      const cacheKey = documentId ? `${documentId}_${question}` : null;
      if (cacheKey && this.documentCache.has(cacheKey)) {
        console.log('Cache: Returning cached answer');
        return this.documentCache.get(cacheKey);
      }
      
      const prompt = `
        Based on the following legal document, please answer this question: "${question}"
        
        Instructions:
        - Provide a direct, accurate answer based only on the document content
        - Quote relevant sections from the document to support your answer
        - If the information is not in the document, clearly state that
        - Be specific and cite exact clauses or sections when possible
        - If there are multiple relevant parts, list them all
        
        Question: ${question}
        
        Document Content:
        ${documentText}
      `;
      
      const result = await this.geminiClient.generateContent(prompt);
      
      const answer = {
        question,
        answer: result.text,
        confidence: result.confidence,
        model: result.model,
        timestamp: new Date().toISOString(),
        documentId: documentId
      };
      
      // Cache the answer if documentId provided
      if (cacheKey) {
        this.documentCache.set(cacheKey, answer);
      }
      
      console.log(`Success: Question answered with confidence: ${result.confidence}`);
      return answer;
      
    } catch (error) {
      console.error(`Error: Error answering question:`, error.message);
      throw new Error(`Failed to answer question: ${error.message}`);
    }
  }

  /**
   * Extract specific information from document
   */
  async extractInformation(documentText, extractionType) {
    try {
      console.log(`Extracting: Extracting ${extractionType} from document`);
      
      const prompts = {
        dates: `Extract all dates mentioned in this document. Format as JSON array with date, context, and importance level.`,
        amounts: `Extract all monetary amounts, percentages, and financial terms. Format as JSON array with amount, currency, context.`,
        contacts: `Extract all contact information including names, addresses, phone numbers, emails. Format as JSON array.`,
        obligations: `Extract all obligations and responsibilities for each party. Format as JSON with party names as keys.`,
        deadlines: `Extract all deadlines, due dates, and time-sensitive requirements. Format as JSON array with deadline, description, party responsible.`,
        risks: `Identify potential risks, penalties, and concerning clauses. Format as JSON array with risk description and severity level.`
      };
      
      const prompt = `${prompts[extractionType] || prompts.obligations}
      
      Document Content:
      ${documentText}`;
      
      const result = await this.geminiClient.generateContent(prompt);
      
      // Try to parse as JSON, fallback to text
      let extractedData;
      try {
        extractedData = JSON.parse(result.text);
      } catch {
        extractedData = result.text;
      }
      
      return {
        extractionType,
        data: extractedData,
        confidence: result.confidence,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error: Error extracting ${extractionType}:`, error.message);
      throw new Error(`Information extraction failed: ${error.message}`);
    }
  }

  /**
   * Compare two documents
   */
  async compareDocuments(document1Text, document2Text, comparisonType = 'differences') {
    try {
      console.log(`Comparing: Comparing documents (${comparisonType})`);
      
      const prompt = `
        Compare these two legal documents and identify:
        
        1. **Key Differences**: What are the main differences between the documents?
        2. **Similar Clauses**: What clauses or terms are similar or identical?
        3. **Missing Elements**: What's present in one document but missing in the other?
        4. **Risk Assessment**: Which document has more favorable terms and why?
        5. **Recommendations**: Which document would you recommend and what changes should be made?
        
        Document 1:
        ${document1Text}
        
        ---
        
        Document 2:
        ${document2Text}
      `;
      
      const result = await this.geminiClient.generateContent(prompt);
      
      return {
        comparisonType,
        analysis: result.text,
        confidence: result.confidence,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error: Error comparing documents:`, error.message);
      throw new Error(`Document comparison failed: ${error.message}`);
    }
  }

  /**
   * Generate document insights and recommendations
   */
  async generateInsights(documentText) {
    try {
      console.log(`Insights: Generating insights for document`);
      
      const prompt = `
        Provide strategic insights and recommendations for this legal document:
        
        1. **Strengths**: What are the strong points of this document?
        2. **Weaknesses**: What areas need improvement or pose risks?
        3. **Missing Clauses**: What important clauses might be missing?
        4. **Negotiation Points**: What terms could be negotiated for better outcomes?
        5. **Compliance Issues**: Any potential legal or regulatory concerns?
        6. **Best Practices**: How does this compare to industry best practices?
        7. **Action Items**: What immediate actions should be taken?
        
        Document Content:
        ${documentText}
      `;
      
      const result = await this.geminiClient.generateContent(prompt);
      
      return {
        insights: result.text,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        recommendations: this._extractRecommendations(result.text)
      };
      
    } catch (error) {
      console.error(`Error: Error generating insights:`, error.message);
      throw new Error(`Insight generation failed: ${error.message}`);
    }
  }

  /**
   * Extract actionable recommendations from insights
   */
  _extractRecommendations(insightsText) {
    // Simple extraction of action items and recommendations
    const lines = insightsText.split('\n');
    const recommendations = [];
    
    for (const line of lines) {
      if (line.includes('recommend') || line.includes('should') || line.includes('action')) {
        recommendations.push(line.trim());
      }
    }
    
    return recommendations;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.documentCache.clear();
    console.log('Cache: Document cache cleared');
  }
}

module.exports = AIDocumentAnalyzer;
