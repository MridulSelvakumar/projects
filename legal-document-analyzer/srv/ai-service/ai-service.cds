using { Currency, managed, cuid } from '@sap/cds/common';

namespace ai.service;

/**
 * Enterprise AI Service for Legal Document Analysis
 */
service AIService {
    
    // Document Analysis
    action analyzeDocument(
        documentText: String,
        analysisType: String
    ) returns {
        success: Boolean;
        analysisType: String;
        timestamp: String;
        results: array of {
            type: String;
            content: String;
            confidence: Decimal;
            riskLevel: String;
        };
        confidence: Integer;
        processingTime: String;
    };

    // AI Question & Answer
    action askQuestion(
        question: String,
        documentText: String,
        context: String
    ) returns {
        success: Boolean;
        question: String;
        answer: String;
        confidence: Decimal;
        sources: array of String;
        timestamp: String;
    };

    // Risk Assessment
    action performRiskAssessment(
        documentText: String,
        riskCategories: array of String
    ) returns {
        success: Boolean;
        overallRiskLevel: String;
        riskCategories: array of {
            category: String;
            level: String;
            score: Decimal;
            findings: array of String;
        };
        recommendations: array of String;
        timestamp: String;
    };

    // Compliance Checking
    action checkCompliance(
        documentText: String,
        regulations: array of String
    ) returns {
        success: Boolean;
        overallCompliance: Decimal;
        regulationResults: array of {
            regulation: String;
            compliant: Boolean;
            score: Decimal;
            findings: array of String;
        };
        violations: array of String;
        recommendations: array of String;
        timestamp: String;
    };

    // Clause Extraction
    action extractClauses(
        documentText: String,
        clauseTypes: array of String
    ) returns {
        success: Boolean;
        clauses: array of {
            type: String;
            content: String;
            location: String;
            importance: String;
        };
        summary: String;
        timestamp: String;
    };

    // Document Summary
    action generateSummary(
        documentText: String,
        summaryType: String
    ) returns {
        success: Boolean;
        summaryType: String;
        summary: String;
        keyPoints: array of String;
        actionItems: array of String;
        timestamp: String;
    };

    // Batch Analysis
    action batchAnalysis(
        documents: array of {
            id: String;
            name: String;
            text: String;
        },
        analysisTypes: array of String
    ) returns {
        success: Boolean;
        totalDocuments: Integer;
        results: array of {
            documentId: String;
            documentName: String;
            analysis: array of {
                type: String;
                content: String;
                confidence: Decimal;
                riskLevel: String;
            };
            processedAt: String;
        };
        summary: String;
        timestamp: String;
    };

    // Document Processing Status
    entity ProcessingJobs : cuid, managed {
        jobId: String;
        documentId: String;
        documentName: String;
        status: String enum { PENDING; PROCESSING; COMPLETED; FAILED };
        progress: Integer;
        startTime: Timestamp;
        endTime: Timestamp;
        results: String; // JSON string
        errorMessage: String;
    };

    // AI Model Configuration
    entity AIModels : cuid {
        modelName: String;
        modelType: String enum { ANALYSIS; QA; RISK; COMPLIANCE; EXTRACTION; SUMMARY };
        version: String;
        isActive: Boolean;
        configuration: String; // JSON string
        performance: Decimal;
        lastUpdated: Timestamp;
    };

    // Analysis History
    entity AnalysisHistory : cuid, managed {
        documentId: String;
        documentName: String;
        analysisType: String;
        results: String; // JSON string
        confidence: Decimal;
        processingTime: Integer; // milliseconds
        userId: String;
        sessionId: String;
    };
}
