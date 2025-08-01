/**
 * AI Service Module Exports
 * Central export point for all AI service components
 */

const AIService = require('./ai-service');
const AIModels = require('./ai-models');
const AIUtils = require('./ai-utils');

module.exports = {
    AIService,
    AIModels,
    AIUtils
};

// Export individual components for direct import
module.exports.AIService = AIService;
module.exports.AIModels = AIModels;
module.exports.AIUtils = AIUtils;

// Export factory functions
module.exports.createAIService = () => new AIService();
module.exports.createAIModels = () => new AIModels();

// Export configuration
module.exports.config = {
    version: '1.0.0',
    name: 'Enterprise AI Service',
    description: 'Comprehensive AI-powered legal document analysis service',
    capabilities: [
        'Document Analysis',
        'Question Answering',
        'Risk Assessment',
        'Compliance Checking',
        'Clause Extraction',
        'Summary Generation',
        'Batch Processing'
    ],
    supportedFormats: [
        'PDF',
        'DOC',
        'DOCX',
        'TXT',
        'RTF'
    ],
    maxFileSize: '50MB',
    processingTimeout: 300000, // 5 minutes
    batchLimit: 100
};

console.log('🤖 AI Service module loaded successfully');
