sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat"
], (Controller, JSONModel, MessageToast, DateFormat) => {
    "use strict";

    return Controller.extend("project1.controller.Dashboard", {
        
        onInit() {
            console.log("Dashboard Controller initialized");
            
            // Initialize models
            this._initializeModels();
            
            // Load dashboard data
            this._loadDashboardData();
            
            // Set up refresh timer (refresh every 30 seconds)
            this._setupAutoRefresh();
        },

        _initializeModels() {
            // Dashboard metrics model
            const dashboardModel = new JSONModel({
                metrics: {
                    totalDocuments: 0,
                    processedDocuments: 0,
                    totalClauses: 0,
                    totalQueries: 0,
                    avgProcessingTime: 0,
                    successRate: 0
                },
                recentDocuments: [],
                clauseDistribution: [],
                processingStatus: [],
                queryPerformance: [],
                recentActivity: [],
                isLoading: true,
                lastUpdated: new Date()
            });
            
            this.getView().setModel(dashboardModel, "dashboard");
            
            // Chart data model
            const chartModel = new JSONModel({
                documentsByType: [],
                processingTrend: [],
                clauseTypes: []
            });
            
            this.getView().setModel(chartModel, "charts");
        },

        _loadDashboardData() {
            this._setLoading(true);
            
            Promise.all([
                this._loadDocumentMetrics(),
                this._loadRecentDocuments(),
                this._loadClauseDistribution(),
                this._loadProcessingStatus(),
                this._loadQueryPerformance(),
                this._loadRecentActivity()
            ]).then(() => {
                this._setLoading(false);
                this._updateLastRefreshTime();
                MessageToast.show("Dashboard data refreshed");
            }).catch((error) => {
                this._setLoading(false);
                console.error("Error loading dashboard data:", error);
                MessageToast.show("Error loading dashboard data");
            });
        },

        _loadDocumentMetrics() {
            return new Promise((resolve, reject) => {
                // Get main service model
                const oModel = this.getView().getModel();
                
                // Load document statistics
                oModel.read("/DocumentStatistics", {
                    success: (data) => {
                        const metrics = data.results && data.results.length > 0 ? data.results[0] : {
                            totalDocuments: 0,
                            processedDocuments: 0,
                            totalClauses: 0,
                            totalQueries: 0,
                            avgProcessingTime: 0,
                            successRate: 0
                        };
                        
                        this.getView().getModel("dashboard").setProperty("/metrics", metrics);
                        resolve(metrics);
                    },
                    error: (error) => {
                        console.warn("DocumentStatistics not available, using mock data");
                        // Use mock data if service not available
                        const mockMetrics = {
                            totalDocuments: 156,
                            processedDocuments: 142,
                            totalClauses: 1247,
                            totalQueries: 89,
                            avgProcessingTime: 2.3,
                            successRate: 94.2
                        };
                        this.getView().getModel("dashboard").setProperty("/metrics", mockMetrics);
                        resolve(mockMetrics);
                    }
                });
            });
        },

        _loadRecentDocuments() {
            return new Promise((resolve, reject) => {
                const oModel = this.getView().getModel();
                
                oModel.read("/Documents", {
                    urlParameters: {
                        "$top": 10,
                        "$orderby": "modifiedAt desc",
                        "$select": "ID,title,documentType,status,uploadedBy,createdAt,modifiedAt"
                    },
                    success: (data) => {
                        this.getView().getModel("dashboard").setProperty("/recentDocuments", data.results || []);
                        resolve(data.results);
                    },
                    error: (error) => {
                        console.warn("Recent documents not available, using mock data");
                        const mockDocuments = [
                            {
                                ID: "1",
                                title: "Service Agreement - TechCorp",
                                documentType: "Contract",
                                status: "PROCESSED",
                                uploadedBy: "john.doe",
                                createdAt: new Date(Date.now() - 86400000).toISOString()
                            },
                            {
                                ID: "2", 
                                title: "NDA - StartupXYZ",
                                documentType: "NDA",
                                status: "PROCESSING",
                                uploadedBy: "jane.smith",
                                createdAt: new Date(Date.now() - 172800000).toISOString()
                            }
                        ];
                        this.getView().getModel("dashboard").setProperty("/recentDocuments", mockDocuments);
                        resolve(mockDocuments);
                    }
                });
            });
        },

        _loadClauseDistribution() {
            return new Promise((resolve, reject) => {
                const oModel = this.getView().getModel();
                
                oModel.read("/ClauseTypeDistribution", {
                    success: (data) => {
                        this.getView().getModel("dashboard").setProperty("/clauseDistribution", data.results || []);
                        this._updateClauseChart(data.results || []);
                        resolve(data.results);
                    },
                    error: (error) => {
                        console.warn("Clause distribution not available, using mock data");
                        const mockDistribution = [
                            { clauseType: "Liability", clauseCount: 45, avgConfidence: 0.92 },
                            { clauseType: "Confidentiality", clauseCount: 38, avgConfidence: 0.89 },
                            { clauseType: "Termination", clauseCount: 32, avgConfidence: 0.94 },
                            { clauseType: "Payment", clauseCount: 28, avgConfidence: 0.87 },
                            { clauseType: "Intellectual Property", clauseCount: 22, avgConfidence: 0.91 }
                        ];
                        this.getView().getModel("dashboard").setProperty("/clauseDistribution", mockDistribution);
                        this._updateClauseChart(mockDistribution);
                        resolve(mockDistribution);
                    }
                });
            });
        },

        _loadProcessingStatus() {
            return new Promise((resolve, reject) => {
                const oModel = this.getView().getModel();
                
                oModel.read("/ProcessingStatus", {
                    success: (data) => {
                        this.getView().getModel("dashboard").setProperty("/processingStatus", data.results || []);
                        resolve(data.results);
                    },
                    error: (error) => {
                        console.warn("Processing status not available, using mock data");
                        const mockStatus = [
                            { status: "PROCESSED", count: 142, percentage: 91.0 },
                            { status: "PROCESSING", count: 8, percentage: 5.1 },
                            { status: "ERROR", count: 4, percentage: 2.6 },
                            { status: "UPLOADED", count: 2, percentage: 1.3 }
                        ];
                        this.getView().getModel("dashboard").setProperty("/processingStatus", mockStatus);
                        resolve(mockStatus);
                    }
                });
            });
        },

        _loadQueryPerformance() {
            return new Promise((resolve, reject) => {
                const oModel = this.getView().getModel();
                
                oModel.read("/QueryPerformance", {
                    urlParameters: {
                        "$top": 20,
                        "$orderby": "createdAt desc"
                    },
                    success: (data) => {
                        this.getView().getModel("dashboard").setProperty("/queryPerformance", data.results || []);
                        resolve(data.results);
                    },
                    error: (error) => {
                        console.warn("Query performance not available, using mock data");
                        const mockPerformance = [
                            { avgResponseTime: 1.2, totalQueries: 89, successRate: 94.2 },
                            { avgResponseTime: 1.5, totalQueries: 76, successRate: 92.1 },
                            { avgResponseTime: 1.1, totalQueries: 95, successRate: 96.8 }
                        ];
                        this.getView().getModel("dashboard").setProperty("/queryPerformance", mockPerformance);
                        resolve(mockPerformance);
                    }
                });
            });
        },

        _loadRecentActivity() {
            return new Promise((resolve, reject) => {
                const oModel = this.getView().getModel();
                
                oModel.read("/RecentActivity", {
                    urlParameters: {
                        "$top": 15,
                        "$orderby": "modifiedAt desc"
                    },
                    success: (data) => {
                        this.getView().getModel("dashboard").setProperty("/recentActivity", data.results || []);
                        resolve(data.results);
                    },
                    error: (error) => {
                        console.warn("Recent activity not available, using mock data");
                        const mockActivity = [
                            {
                                title: "Service Agreement processed",
                                documentType: "Contract",
                                status: "PROCESSED",
                                modifiedAt: new Date(Date.now() - 300000).toISOString()
                            },
                            {
                                title: "NDA analysis started",
                                documentType: "NDA", 
                                status: "PROCESSING",
                                modifiedAt: new Date(Date.now() - 600000).toISOString()
                            }
                        ];
                        this.getView().getModel("dashboard").setProperty("/recentActivity", mockActivity);
                        resolve(mockActivity);
                    }
                });
            });
        },

        _updateClauseChart(data) {
            const chartData = data.map(item => ({
                clauseType: item.clauseType,
                count: item.clauseCount,
                confidence: Math.round(item.avgConfidence * 100)
            }));
            
            this.getView().getModel("charts").setProperty("/clauseTypes", chartData);
        },

        _setLoading(loading) {
            this.getView().getModel("dashboard").setProperty("/isLoading", loading);
        },

        _updateLastRefreshTime() {
            this.getView().getModel("dashboard").setProperty("/lastUpdated", new Date());
        },

        _setupAutoRefresh() {
            // Auto-refresh every 30 seconds
            this._refreshTimer = setInterval(() => {
                this._loadDashboardData();
            }, 30000);
        },

        onRefresh() {
            this._loadDashboardData();
        },

        onNavBack() {
            const router = this.getOwnerComponent().getRouter();
            router.navTo("RouteDashboard");
        },

        onDocumentPress(oEvent) {
            const oContext = oEvent.getSource().getBindingContext("dashboard");
            const documentId = oContext.getProperty("ID");
            
            // Navigate to document details
            this.getRouter().navTo("documentDetail", {
                documentId: documentId
            });
        },

        onNavigateToDocuments() {
            this.getRouter().navTo("documents");
        },

        onNavigateToClauses() {
            this.getRouter().navTo("clauses");
        },

        onNavigateToQueries() {
            this.getRouter().navTo("queries");
        },

        formatDate(date) {
            if (!date) return "";
            const oDateFormat = DateFormat.getDateTimeInstance({
                style: "medium"
            });
            return oDateFormat.format(new Date(date));
        },

        formatStatus(status) {
            const statusMap = {
                "PROCESSED": "Success",
                "PROCESSING": "Warning", 
                "ERROR": "Error",
                "UPLOADED": "Information"
            };
            return statusMap[status] || "None";
        },

        formatPercentage(value) {
            return value ? value.toFixed(1) + "%" : "0%";
        },

        onExit() {
            if (this._refreshTimer) {
                clearInterval(this._refreshTimer);
            }
        }
    });
});
