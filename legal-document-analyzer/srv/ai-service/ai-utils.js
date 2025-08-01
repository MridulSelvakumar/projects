/**
 * AI Service Utilities
 * Common utility functions for AI processing
 */

class AIUtils {
    
    /**
     * Text preprocessing for AI analysis
     */
    static preprocessText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s\.\,\;\:\!\?\-\(\)]/g, '') // Remove special chars
            .substring(0, 50000); // Limit length for processing
    }

    /**
     * Extract document metadata
     */
    static extractMetadata(documentText) {
        const metadata = {
            wordCount: this.getWordCount(documentText),
            characterCount: documentText.length,
            estimatedReadingTime: this.calculateReadingTime(documentText),
            documentType: this.detectDocumentType(documentText),
            language: this.detectLanguage(documentText),
            complexity: this.assessComplexity(documentText)
        };

        return metadata;
    }

    /**
     * Get word count
     */
    static getWordCount(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Calculate estimated reading time
     */
    static calculateReadingTime(text) {
        const wordsPerMinute = 200;
        const wordCount = this.getWordCount(text);
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    /**
     * Detect document type based on content
     */
    static detectDocumentType(text) {
        const textLower = text.toLowerCase();
        
        const patterns = {
            'contract': /\b(contract|agreement|party|parties|whereas|hereby)\b/g,
            'policy': /\b(policy|procedure|guideline|standard|compliance)\b/g,
            'nda': /\b(confidential|non.disclosure|proprietary|trade.secret)\b/g,
            'sla': /\b(service.level|sla|uptime|availability|performance)\b/g,
            'terms': /\b(terms.of.service|terms.and.conditions|user.agreement)\b/g,
            'invoice': /\b(invoice|bill|payment|amount.due|total)\b/g,
            'report': /\b(report|analysis|findings|summary|conclusion)\b/g
        };

        let maxMatches = 0;
        let detectedType = 'document';

        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = (textLower.match(pattern) || []).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedType = type;
            }
        }

        return detectedType;
    }

    /**
     * Detect document language (simplified)
     */
    static detectLanguage(text) {
        // Simple language detection based on common words
        const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
        const englishMatches = (text.match(englishWords) || []).length;
        
        // For demo purposes, assume English if common English words found
        return englishMatches > 10 ? 'en' : 'unknown';
    }

    /**
     * Assess document complexity
     */
    static assessComplexity(text) {
        const wordCount = this.getWordCount(text);
        const sentences = text.split(/[.!?]+/).length;
        const avgWordsPerSentence = wordCount / sentences;
        
        // Simple complexity scoring
        if (avgWordsPerSentence > 25 || wordCount > 10000) {
            return 'high';
        } else if (avgWordsPerSentence > 15 || wordCount > 5000) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Generate confidence score based on various factors
     */
    static calculateConfidence(factors) {
        const {
            textQuality = 0.8,
            modelPerformance = 0.9,
            documentType = 0.85,
            contentLength = 0.75
        } = factors;

        const weights = {
            textQuality: 0.3,
            modelPerformance: 0.4,
            documentType: 0.2,
            contentLength: 0.1
        };

        const weightedScore = 
            (textQuality * weights.textQuality) +
            (modelPerformance * weights.modelPerformance) +
            (documentType * weights.documentType) +
            (contentLength * weights.contentLength);

        return Math.round(weightedScore * 100) / 100;
    }

    /**
     * Format analysis results for display
     */
    static formatAnalysisResults(results) {
        return results.map(result => ({
            ...result,
            confidence: Math.round(result.confidence * 100),
            formattedContent: this.truncateText(result.content, 200),
            riskColor: this.getRiskColor(result.riskLevel)
        }));
    }

    /**
     * Truncate text with ellipsis
     */
    static truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Get color code for risk level
     */
    static getRiskColor(riskLevel) {
        const colors = {
            'Low': '#28a745',
            'Medium': '#ffc107',
            'High': '#dc3545'
        };
        return colors[riskLevel] || '#6c757d';
    }

    /**
     * Validate input parameters
     */
    static validateInput(input, requiredFields) {
        const errors = [];
        
        for (const field of requiredFields) {
            if (!input.hasOwnProperty(field) || input[field] === null || input[field] === undefined) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        if (input.documentText && typeof input.documentText !== 'string') {
            errors.push('documentText must be a string');
        }

        if (input.documentText && input.documentText.length === 0) {
            errors.push('documentText cannot be empty');
        }

        return errors;
    }

    /**
     * Generate processing job ID
     */
    static generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Calculate processing time estimate
     */
    static estimateProcessingTime(documentText, analysisType) {
        const baseTime = 1000; // 1 second base
        const wordCount = this.getWordCount(documentText);
        const wordFactor = Math.ceil(wordCount / 1000) * 500; // 0.5s per 1000 words
        
        const typeMultipliers = {
            'quick': 0.5,
            'full': 1.0,
            'comprehensive': 1.5,
            'batch': 2.0
        };

        const multiplier = typeMultipliers[analysisType] || 1.0;
        return Math.round((baseTime + wordFactor) * multiplier);
    }

    /**
     * Format timestamp for display
     */
    static formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Generate analysis summary
     */
    static generateAnalysisSummary(results) {
        const totalItems = results.length;
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / totalItems;
        const riskDistribution = this.getRiskDistribution(results);
        
        return {
            totalItems,
            averageConfidence: Math.round(avgConfidence * 100),
            riskDistribution,
            processingTime: this.formatTimestamp(new Date()),
            status: 'completed'
        };
    }

    /**
     * Get risk level distribution
     */
    static getRiskDistribution(results) {
        const distribution = { Low: 0, Medium: 0, High: 0 };
        
        results.forEach(result => {
            if (distribution.hasOwnProperty(result.riskLevel)) {
                distribution[result.riskLevel]++;
            }
        });

        return distribution;
    }

    /**
     * Sanitize text for safe display
     */
    static sanitizeText(text) {
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
}

module.exports = AIUtils;
