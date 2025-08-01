sap.ui.define([
    "sap/ui/base/Object"
], (BaseObject) => {
    "use strict";

    return BaseObject.extend("project1.service.DataService", {

        constructor: function() {
            this._documents = this._loadStoredDocuments();
            this._analytics = this._loadStoredAnalytics();
            this._initializeEventBus();
        },

        _initializeEventBus() {
            // Create event bus for real-time updates
            this._eventBus = sap.ui.getCore().getEventBus();
        },

        // Document Management
        addDocument(documentData) {
            const document = {
                ID: this._generateId(),
                title: documentData.title || "Untitled Document",
                fileName: documentData.fileName || "unknown.txt",
                documentType: this._detectDocumentType(documentData.content || ""),
                status: "PROCESSED",
                uploadedBy: "current.user",
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                content: documentData.content || "",
                analysis: documentData.analysis || "",
                confidence: documentData.confidence || 0.95,
                processingTime: documentData.processingTime || 2.3,
                size: (documentData.content || "").length
            };

            this._documents.unshift(document);
            this._saveDocuments();
            this._updateAnalytics();
            
            // Notify all listeners
            this._eventBus.publish("DataService", "DocumentAdded", { document });
            this._eventBus.publish("DataService", "DataUpdated", {});

            return document;
        },

        getDocuments() {
            return [...this._documents];
        },

        getDocument(id) {
            return this._documents.find(doc => doc.ID === id);
        },

        updateDocument(id, updates) {
            const index = this._documents.findIndex(doc => doc.ID === id);
            if (index !== -1) {
                this._documents[index] = { ...this._documents[index], ...updates, modifiedAt: new Date().toISOString() };
                this._saveDocuments();
                this._updateAnalytics();
                
                this._eventBus.publish("DataService", "DocumentUpdated", { document: this._documents[index] });
                this._eventBus.publish("DataService", "DataUpdated", {});
                
                return this._documents[index];
            }
            return null;
        },

        deleteDocument(id) {
            const index = this._documents.findIndex(doc => doc.ID === id);
            if (index !== -1) {
                const deleted = this._documents.splice(index, 1)[0];
                this._saveDocuments();
                this._updateAnalytics();
                
                this._eventBus.publish("DataService", "DocumentDeleted", { document: deleted });
                this._eventBus.publish("DataService", "DataUpdated", {});
                
                return deleted;
            }
            return null;
        },

        // Analytics
        getAnalytics() {
            return { ...this._analytics };
        },

        getDashboardStats() {
            const docs = this._documents;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));

            const stats = {
                metrics: {
                    totalDocuments: docs.length,
                    processedDocuments: docs.filter(d => d.status === "PROCESSED").length,
                    totalClauses: docs.reduce((sum, d) => sum + this._estimateClauseCount(d.content), 0),
                    totalQueries: this._analytics.totalQueries || 0,
                    avgProcessingTime: docs.length > 0 ? 
                        docs.reduce((sum, d) => sum + (d.processingTime || 2.3), 0) / docs.length : 0,
                    successRate: docs.length > 0 ? 
                        (docs.filter(d => d.status === "PROCESSED").length / docs.length) * 100 : 0
                },
                recentDocuments: docs.slice(0, 10),
                recentActivity: this._generateRecentActivity(docs.slice(0, 5)),
                processingStatus: this._getProcessingStatus(docs),
                clauseDistribution: this._getClauseDistribution(docs),
                queryPerformance: this._getQueryPerformance()
            };

            return stats;
        },

        // Event Subscription
        subscribe(channel, event, callback, context) {
            this._eventBus.subscribe(channel, event, callback, context);
        },

        unsubscribe(channel, event, callback, context) {
            this._eventBus.unsubscribe(channel, event, callback, context);
        },

        // Private Methods
        _loadStoredDocuments() {
            try {
                const stored = localStorage.getItem("legalDocAnalyzer_documents");
                return stored ? JSON.parse(stored) : this._getInitialDocuments();
            } catch (error) {
                console.warn("Failed to load stored documents:", error);
                return this._getInitialDocuments();
            }
        },

        _loadStoredAnalytics() {
            try {
                const stored = localStorage.getItem("legalDocAnalyzer_analytics");
                return stored ? JSON.parse(stored) : this._getInitialAnalytics();
            } catch (error) {
                console.warn("Failed to load stored analytics:", error);
                return this._getInitialAnalytics();
            }
        },

        _saveDocuments() {
            try {
                localStorage.setItem("legalDocAnalyzer_documents", JSON.stringify(this._documents));
            } catch (error) {
                console.warn("Failed to save documents:", error);
            }
        },

        _saveAnalytics() {
            try {
                localStorage.setItem("legalDocAnalyzer_analytics", JSON.stringify(this._analytics));
            } catch (error) {
                console.warn("Failed to save analytics:", error);
            }
        },

        _updateAnalytics() {
            const docs = this._documents;
            this._analytics = {
                ...this._analytics,
                totalDocuments: docs.length,
                processedDocuments: docs.filter(d => d.status === "PROCESSED").length,
                lastUpdated: new Date().toISOString(),
                documentTypes: this._getDocumentTypeDistribution(docs),
                avgConfidence: docs.length > 0 ? 
                    docs.reduce((sum, d) => sum + (d.confidence || 0.95), 0) / docs.length : 0
            };
            this._saveAnalytics();
        },

        _generateId() {
            return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        _detectDocumentType(content) {
            const text = content.toLowerCase();
            if (text.includes('employment') || text.includes('job') || text.includes('salary')) return 'Employment Agreement';
            if (text.includes('license') || text.includes('software')) return 'License Agreement';
            if (text.includes('confidential') || text.includes('nda') || text.includes('non-disclosure')) return 'NDA';
            if (text.includes('service') || text.includes('vendor')) return 'Service Agreement';
            if (text.includes('merger') || text.includes('acquisition')) return 'M&A Contract';
            if (text.includes('contract') || text.includes('agreement')) return 'Contract';
            return 'Legal Document';
        },

        _estimateClauseCount(content) {
            // Simple estimation based on content length and structure
            const sentences = content.split(/[.!?]+/).length;
            return Math.max(1, Math.floor(sentences / 3));
        },

        _generateRecentActivity(docs) {
            return docs.map(doc => ({
                title: `${doc.title} ${doc.status.toLowerCase()}`,
                documentType: doc.documentType,
                status: doc.status,
                modifiedAt: doc.modifiedAt,
                confidence: Math.round(doc.confidence * 100) + '%'
            }));
        },

        _getProcessingStatus(docs) {
            const statusCounts = docs.reduce((acc, doc) => {
                acc[doc.status] = (acc[doc.status] || 0) + 1;
                return acc;
            }, {});

            const total = docs.length || 1;
            return Object.entries(statusCounts).map(([status, count]) => ({
                status,
                count,
                percentage: (count / total) * 100
            }));
        },

        _getClauseDistribution(docs) {
            // Mock clause distribution based on document types
            const typeDistribution = this._getDocumentTypeDistribution(docs);
            return typeDistribution.map(type => ({
                clauseType: type.type,
                clauseCount: type.count * 5, // Estimate 5 clauses per document
                avgConfidence: 0.92 + (Math.random() * 0.06) // 92-98%
            }));
        },

        _getDocumentTypeDistribution(docs) {
            const typeCounts = docs.reduce((acc, doc) => {
                acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
                return acc;
            }, {});

            return Object.entries(typeCounts).map(([type, count]) => ({
                type,
                count,
                percentage: docs.length > 0 ? (count / docs.length) * 100 : 0
            }));
        },

        _getQueryPerformance() {
            return [
                { avgResponseTime: 1.2, totalQueries: this._analytics.totalQueries || 0, successRate: 94.2 }
            ];
        },

        _getInitialDocuments() {
            return [
                {
                    ID: "sample_1",
                    title: "Sample Software Development Agreement",
                    fileName: "sample-agreement.txt",
                    documentType: "License Agreement",
                    status: "PROCESSED",
                    uploadedBy: "demo.user",
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    modifiedAt: new Date(Date.now() - 86400000).toISOString(),
                    content: "Sample software development agreement content...",
                    analysis: "This is a comprehensive software development agreement...",
                    confidence: 0.96,
                    processingTime: 2.1,
                    size: 2847
                }
            ];
        },

        _getInitialAnalytics() {
            return {
                totalDocuments: 1,
                processedDocuments: 1,
                totalQueries: 0,
                avgConfidence: 0.96,
                lastUpdated: new Date().toISOString(),
                documentTypes: [
                    { type: "License Agreement", count: 1, percentage: 100 }
                ]
            };
        }
    });
});
