sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    "project1/service/DataService"
], (Controller, JSONModel, MessageToast, DateFormat, DataService) => {
    "use strict";

    return Controller.extend("project1.controller.Dashboard", {
        
        onInit() {
            console.log("Dashboard Controller initialized");
            console.log("Dashboard view:", this.getView());

            // Initialize data service
            this._initializeDataService();

            // Initialize models
            this._initializeModels();
            console.log("Models initialized");

            // Load dashboard data
            this._loadDashboardData();

            // Set up refresh timer (refresh every 30 seconds)
            this._setupAutoRefresh();

            // Add engaging animations after view is rendered
            setTimeout(() => {
                this._addDashboardAnimations();
            }, 500);
        },

        _initializeDataService() {
            this._dataService = new DataService();

            // Subscribe to data updates for real-time dashboard
            this._dataService.subscribe("DataService", "DataUpdated", this._onDataUpdated, this);
        },

        _onDataUpdated() {
            // Refresh dashboard when data changes
            this._loadDashboardData();
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

        _loadMockData() {
            // Load mock data immediately to ensure dashboard shows content
            const mockMetrics = {
                totalDocuments: 2847,
                processedDocuments: 2698,
                totalClauses: 18542,
                totalQueries: 1456,
                avgProcessingTime: 1.8,
                successRate: 96.7
            };

            const mockRecentDocuments = [
                {
                    ID: "1",
                    title: "Enterprise Software License Agreement",
                    fileName: "enterprise-license.pdf",
                    documentType: "License Agreement",
                    status: "PROCESSED",
                    uploadedBy: "sarah.johnson",
                    createdAt: new Date(Date.now() - 300000).toISOString()
                },
                {
                    ID: "2",
                    title: "Merger & Acquisition Contract",
                    fileName: "ma-contract.pdf",
                    documentType: "M&A Contract",
                    status: "PROCESSED",
                    uploadedBy: "michael.chen",
                    createdAt: new Date(Date.now() - 600000).toISOString()
                },
                {
                    ID: "3",
                    title: "Employment Agreement - Senior Developer",
                    fileName: "employment-agreement.pdf",
                    documentType: "Employment",
                    status: "PROCESSING",
                    uploadedBy: "hr.team",
                    createdAt: new Date(Date.now() - 900000).toISOString()
                },
                {
                    ID: "4",
                    title: "Confidentiality Agreement - Project Alpha",
                    fileName: "nda-alpha.pdf",
                    documentType: "NDA",
                    status: "PROCESSED",
                    uploadedBy: "legal.dept",
                    createdAt: new Date(Date.now() - 1200000).toISOString()
                },
                {
                    ID: "5",
                    title: "Vendor Service Agreement",
                    fileName: "vendor-service.pdf",
                    documentType: "Service Agreement",
                    status: "ERROR",
                    uploadedBy: "procurement",
                    createdAt: new Date(Date.now() - 1500000).toISOString()
                }
            ];

            // Update dashboard model with mock data
            const dashboardModel = this.getView().getModel("dashboard");
            dashboardModel.setProperty("/metrics", mockMetrics);
            dashboardModel.setProperty("/recentDocuments", mockRecentDocuments);
            dashboardModel.setProperty("/isLoading", false);

            // Set dynamic welcome message
            this._setWelcomeMessage(dashboardModel);

            console.log("Mock data loaded for dashboard");
        },

        _loadDashboardData() {
            this._setLoading(true);

            try {
                // Get real-time data from data service
                const dashboardStats = this._dataService.getDashboardStats();
                const dashboardModel = this.getView().getModel("dashboard");

                // Update all dashboard data with real statistics
                dashboardModel.setProperty("/metrics", dashboardStats.metrics);
                dashboardModel.setProperty("/recentDocuments", dashboardStats.recentDocuments);
                dashboardModel.setProperty("/recentActivity", dashboardStats.recentActivity);
                dashboardModel.setProperty("/processingStatus", dashboardStats.processingStatus);
                dashboardModel.setProperty("/clauseDistribution", dashboardStats.clauseDistribution);
                dashboardModel.setProperty("/queryPerformance", dashboardStats.queryPerformance);

                this._setLoading(false);
                this._updateLastRefreshTime();
                this._setWelcomeMessage(dashboardModel);

                console.log("Dashboard updated with real data:", dashboardStats.metrics);

                // Only show toast on manual refresh, not on auto-refresh
                if (this._manualRefresh) {
                    MessageToast.show("Dashboard refreshed with real-time data!");
                    this._manualRefresh = false;
                }
            } catch (error) {
                console.error("Error loading dashboard data:", error);
                this._setLoading(false);
                this._loadMockData(); // Fallback to mock data
                MessageToast.show("Using sample data - analyze documents to see real statistics");
            }
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
                            { clauseType: "Liability & Indemnification", clauseCount: 1247, avgConfidence: 0.94 },
                            { clauseType: "Confidentiality & Non-Disclosure", clauseCount: 1089, avgConfidence: 0.91 },
                            { clauseType: "Termination & Cancellation", clauseCount: 987, avgConfidence: 0.96 },
                            { clauseType: "Payment & Financial Terms", clauseCount: 856, avgConfidence: 0.89 },
                            { clauseType: "Intellectual Property Rights", clauseCount: 743, avgConfidence: 0.93 },
                            { clauseType: "Force Majeure", clauseCount: 654, avgConfidence: 0.88 },
                            { clauseType: "Governing Law & Jurisdiction", clauseCount: 567, avgConfidence: 0.95 }
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
                            { status: "PROCESSED", count: 2698, percentage: 94.8 },
                            { status: "PROCESSING", count: 89, percentage: 3.1 },
                            { status: "ERROR", count: 35, percentage: 1.2 },
                            { status: "UPLOADED", count: 25, percentage: 0.9 }
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
                                title: "Enterprise License Agreement analyzed",
                                documentType: "License Agreement",
                                status: "PROCESSED",
                                modifiedAt: new Date(Date.now() - 120000).toISOString()
                            },
                            {
                                title: "M&A Contract risk assessment completed",
                                documentType: "M&A Contract",
                                status: "PROCESSED",
                                modifiedAt: new Date(Date.now() - 300000).toISOString()
                            },
                            {
                                title: "Employment Agreement processing started",
                                documentType: "Employment",
                                status: "PROCESSING",
                                modifiedAt: new Date(Date.now() - 450000).toISOString()
                            },
                            {
                                title: "Vendor Service Agreement uploaded",
                                documentType: "Service Agreement",
                                status: "UPLOADED",
                                modifiedAt: new Date(Date.now() - 600000).toISOString()
                            },
                            {
                                title: "Confidentiality Agreement clause extraction",
                                documentType: "NDA",
                                status: "PROCESSED",
                                modifiedAt: new Date(Date.now() - 750000).toISOString()
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
            this._manualRefresh = true;
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

        onNavigateToAIAnalyzer() {
            const router = this.getOwnerComponent().getRouter();
            router.navTo("RouteAIAnalyzer");
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

        getStatusIcon(status) {
            const iconMap = {
                "PROCESSED": "sap-icon://accept",
                "PROCESSING": "sap-icon://pending",
                "ERROR": "sap-icon://error",
                "UPLOADED": "sap-icon://upload"
            };
            return iconMap[status] || "sap-icon://question-mark";
        },

        getStatusColor(status) {
            const colorMap = {
                "PROCESSED": "Positive",
                "PROCESSING": "Critical",
                "ERROR": "Negative",
                "UPLOADED": "Information"
            };
            return colorMap[status] || "Default";
        },

        onNavigateToAnalytics() {
            const router = this.getOwnerComponent().getRouter();
            router.navTo("RouteAnalytics");
        },

        onNavigateToSettings() {
            const router = this.getOwnerComponent().getRouter();
            router.navTo("RouteSettings");
        },

        getRouter() {
            return this.getOwnerComponent().getRouter();
        },

        _addDashboardAnimations() {
            // Add staggered animation to metric cards
            const metricCards = document.querySelectorAll('.metricCard');
            metricCards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.6s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 150);
            });

            // Add animation to content cards
            const contentCards = document.querySelectorAll('.contentCard');
            contentCards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.6s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateX(0)';
                }, 800 + (index * 200));
            });

            // Animate numbers in metric cards
            this._animateNumbers();
        },

        _animateNumbers() {
            const metrics = this.getView().getModel("dashboard").getProperty("/metrics");

            // Animate total documents
            this._animateCounter("totalDocuments", 0, metrics.totalDocuments, 2000);

            // Animate success rate
            this._animateCounter("successRate", 0, metrics.successRate, 2500, "%");

            // Animate processing time
            this._animateCounter("avgProcessingTime", 0, metrics.avgProcessingTime, 1800, "s");

            // Animate total clauses
            this._animateCounter("totalClauses", 0, metrics.totalClauses, 2200);
        },

        _animateCounter(property, start, end, duration, suffix = "") {
            const startTime = Date.now();
            const model = this.getView().getModel("dashboard");

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for smooth animation
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = start + (end - start) * easeOutQuart;

                model.setProperty(`/metrics/${property}`,
                    suffix === "%" || suffix === "s" ?
                    Math.round(current * 10) / 10 :
                    Math.round(current)
                );

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        },

        _setWelcomeMessage(model) {
            const hour = new Date().getHours();
            let greeting, subtitle;

            if (hour < 12) {
                greeting = "Good Morning! Ready to tackle today's legal documents?";
                subtitle = "Start your day with AI-powered document analysis and insights";
            } else if (hour < 17) {
                greeting = "Good Afternoon! Your legal document hub is active";
                subtitle = "Continue processing and analyzing documents with enterprise AI";
            } else {
                greeting = "Good Evening! Wrapping up your document workflow";
                subtitle = "Review today's progress and prepare for tomorrow's tasks";
            }

            model.setProperty("/welcomeMessage", greeting);
            model.setProperty("/welcomeSubtitle", subtitle);
        },

        onExit() {
            if (this._refreshTimer) {
                clearInterval(this._refreshTimer);
            }

            if (this._dataService) {
                this._dataService.unsubscribe("DataService", "DataUpdated", this._onDataUpdated, this);
            }
        }
    });
});
