/**
 * AI Models Configuration and Management
 * Handles different AI models for various analysis tasks
 */

class AIModels {
    
    constructor() {
        this.models = {
            documentAnalysis: {
                name: 'LegalDoc-Analyzer-v2.1',
                type: 'ANALYSIS',
                version: '2.1.0',
                isActive: true,
                performance: 0.94,
                capabilities: [
                    'Contract classification',
                    'Key term extraction',
                    'Risk assessment',
                    'Compliance checking'
                ]
            },
            questionAnswering: {
                name: 'LegalQA-Enterprise-v1.8',
                type: 'QA',
                version: '1.8.0',
                isActive: true,
                performance: 0.91,
                capabilities: [
                    'Natural language queries',
                    'Context-aware responses',
                    'Source attribution',
                    'Confidence scoring'
                ]
            },
            riskAssessment: {
                name: 'RiskAnalyzer-Pro-v3.0',
                type: 'RISK',
                version: '3.0.0',
                isActive: true,
                performance: 0.89,
                capabilities: [
                    'Multi-dimensional risk analysis',
                    'Financial risk evaluation',
                    'Legal risk identification',
                    'Operational risk assessment'
                ]
            },
            complianceChecker: {
                name: 'ComplianceGuard-v2.5',
                type: 'COMPLIANCE',
                version: '2.5.0',
                isActive: true,
                performance: 0.96,
                capabilities: [
                    'GDPR compliance checking',
                    'CCPA compliance verification',
                    'SOX compliance assessment',
                    'HIPAA compliance validation'
                ]
            },
            clauseExtractor: {
                name: 'ClauseExtract-AI-v1.9',
                type: 'EXTRACTION',
                version: '1.9.0',
                isActive: true,
                performance: 0.92,
                capabilities: [
                    'Payment term extraction',
                    'Termination clause identification',
                    'Liability clause analysis',
                    'Confidentiality term extraction'
                ]
            },
            summaryGenerator: {
                name: 'SummaryMaster-v2.2',
                type: 'SUMMARY',
                version: '2.2.0',
                isActive: true,
                performance: 0.88,
                capabilities: [
                    'Executive summary generation',
                    'Key point extraction',
                    'Action item identification',
                    'Risk highlight summary'
                ]
            }
        };
    }

    /**
     * Get model configuration for specific task
     */
    getModel(taskType) {
        const modelMap = {
            'document_analysis': 'documentAnalysis',
            'question_answering': 'questionAnswering',
            'risk_assessment': 'riskAssessment',
            'compliance_check': 'complianceChecker',
            'clause_extraction': 'clauseExtractor',
            'summary_generation': 'summaryGenerator'
        };

        const modelKey = modelMap[taskType];
        if (!modelKey || !this.models[modelKey]) {
            throw new Error(`No model available for task type: ${taskType}`);
        }

        return this.models[modelKey];
    }

    /**
     * Get all active models
     */
    getActiveModels() {
        return Object.values(this.models).filter(model => model.isActive);
    }

    /**
     * Get model performance metrics
     */
    getModelPerformance(modelName) {
        const model = Object.values(this.models).find(m => m.name === modelName);
        return model ? model.performance : null;
    }

    /**
     * Update model configuration
     */
    updateModel(modelKey, updates) {
        if (this.models[modelKey]) {
            this.models[modelKey] = { ...this.models[modelKey], ...updates };
            return true;
        }
        return false;
    }

    /**
     * Get model capabilities
     */
    getModelCapabilities(taskType) {
        try {
            const model = this.getModel(taskType);
            return model.capabilities;
        } catch (error) {
            return [];
        }
    }

    /**
     * Check if model supports specific capability
     */
    supportsCapability(taskType, capability) {
        const capabilities = this.getModelCapabilities(taskType);
        return capabilities.includes(capability);
    }

    /**
     * Get recommended model for document type
     */
    getRecommendedModel(documentType) {
        const recommendations = {
            'contract': 'documentAnalysis',
            'agreement': 'documentAnalysis',
            'policy': 'complianceChecker',
            'terms': 'clauseExtractor',
            'nda': 'clauseExtractor',
            'sla': 'riskAssessment'
        };

        const modelKey = recommendations[documentType.toLowerCase()];
        return modelKey ? this.models[modelKey] : this.models.documentAnalysis;
    }

    /**
     * Get model status summary
     */
    getModelStatus() {
        const activeModels = this.getActiveModels();
        const avgPerformance = activeModels.reduce((sum, model) => sum + model.performance, 0) / activeModels.length;
        
        return {
            totalModels: Object.keys(this.models).length,
            activeModels: activeModels.length,
            averagePerformance: Math.round(avgPerformance * 100),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Validate model configuration
     */
    validateModel(modelConfig) {
        const required = ['name', 'type', 'version', 'isActive', 'performance'];
        return required.every(field => modelConfig.hasOwnProperty(field));
    }

    /**
     * Get model configuration for API response
     */
    getModelInfo(taskType) {
        try {
            const model = this.getModel(taskType);
            return {
                name: model.name,
                version: model.version,
                performance: model.performance,
                capabilities: model.capabilities,
                isActive: model.isActive
            };
        } catch (error) {
            return null;
        }
    }
}

module.exports = AIModels;
