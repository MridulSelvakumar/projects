sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "project1/service/DataService"
], (BaseController, JSONModel, DataService) => {
    "use strict";

    return BaseController.extend("project1.controller.Analytics", {
        onInit() {
            console.log("Analytics Controller initialized");
            this._initializeDataService();
            this._initializeModel();
            this._loadAnalyticsData();
        },

        _initializeDataService() {
            this._dataService = new DataService();

            // Subscribe to data updates
            this._dataService.subscribe("DataService", "DataUpdated", this._onDataUpdated, this);
        },

        _initializeModel() {
            const analyticsModel = new JSONModel({
                totalDocuments: 0,
                averageAccuracy: "0%",
                averageProcessingTime: "0s",
                distributionText: "No data available",
                recentActivity: [],
                documentTypes: [],
                isLoading: true,
                lastUpdated: new Date()
            });

            this.getView().setModel(analyticsModel, "analytics");
        },

        _loadAnalyticsData() {
            const oModel = this.getView().getModel("analytics");
            oModel.setProperty("/isLoading", true);

            try {
                const analytics = this._dataService.getAnalytics();
                const dashboardStats = this._dataService.getDashboardStats();

                // Update analytics data
                oModel.setProperty("/totalDocuments", analytics.totalDocuments);
                oModel.setProperty("/averageAccuracy", Math.round(analytics.avgConfidence * 100) + "%");
                oModel.setProperty("/averageProcessingTime", dashboardStats.metrics.avgProcessingTime.toFixed(1) + "s");
                oModel.setProperty("/documentTypes", analytics.documentTypes);
                oModel.setProperty("/recentActivity", dashboardStats.recentActivity);
                oModel.setProperty("/lastUpdated", new Date());

                // Generate distribution text
                const distributionText = this._generateDistributionText(analytics.documentTypes);
                oModel.setProperty("/distributionText", distributionText);

                oModel.setProperty("/isLoading", false);

                console.log("Analytics data loaded:", analytics);
            } catch (error) {
                console.error("Failed to load analytics data:", error);
                oModel.setProperty("/isLoading", false);
                this._loadFallbackData();
            }
        },

        _onDataUpdated() {
            this._loadAnalyticsData();
        },

        _generateDistributionText(documentTypes) {
            if (!documentTypes || documentTypes.length === 0) {
                return "No documents processed yet";
            }

            return documentTypes
                .map(type => `${type.type}: ${type.percentage.toFixed(1)}%`)
                .join('\n');
        },

        _loadFallbackData() {
            const fallbackData = {
                totalDocuments: 0,
                averageAccuracy: "0%",
                averageProcessingTime: "0s",
                distributionText: "No documents processed yet",
                recentActivity: [
                    {
                        title: "No recent activity",
                        documentType: "Upload a document to see activity",
                        modifiedAt: new Date().toISOString(),
                        confidence: "N/A"
                    }
                ]
            };

            const oModel = this.getView().getModel("analytics");
            Object.keys(fallbackData).forEach(key => {
                oModel.setProperty("/" + key, fallbackData[key]);
            });
        },

        formatDate(date) {
            if (!date) return "";
            return new Date(date).toLocaleDateString();
        },

        formatConfidence(confidence) {
            if (typeof confidence === 'string') return confidence;
            return Math.round(confidence * 100) + '%';
        },

        onRefresh() {
            this._loadAnalyticsData();
        },

        onExit() {
            if (this._dataService) {
                this._dataService.unsubscribe("DataService", "DataUpdated", this._onDataUpdated, this);
            }
        }
    });
});
