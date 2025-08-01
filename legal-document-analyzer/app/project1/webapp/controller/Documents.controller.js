sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "project1/service/DataService"
], function (Controller, JSONModel, MessageToast, MessageBox, DataService) {
    "use strict";

    return Controller.extend("project1.controller.Documents", {

        onInit: function () {
            this._initializeDataService();
            this._initializeModel();
            this._loadDocuments();
            MessageToast.show("Documents page loaded");
        },

        _initializeDataService: function () {
            this._dataService = new DataService();

            // Subscribe to data updates
            this._dataService.subscribe("DataService", "DataUpdated", this._onDataUpdated, this);
        },

        _initializeModel: function () {
            const documentsModel = new JSONModel({
                documents: [],
                isLoading: true,
                totalCount: 0,
                lastUpdated: new Date()
            });

            this.getView().setModel(documentsModel, "documents");
        },

        _loadDocuments: function () {
            const oModel = this.getView().getModel("documents");
            oModel.setProperty("/isLoading", true);

            try {
                const documents = this._dataService.getDocuments();
                oModel.setProperty("/documents", documents);
                oModel.setProperty("/totalCount", documents.length);
                oModel.setProperty("/lastUpdated", new Date());
                oModel.setProperty("/isLoading", false);

                console.log("Loaded documents:", documents.length);
            } catch (error) {
                console.error("Failed to load documents:", error);
                oModel.setProperty("/isLoading", false);
                MessageToast.show("Failed to load documents");
            }
        },

        _onDataUpdated: function () {
            this._loadDocuments();
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteDashboard");
        },

        onUploadDocument: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteAIAnalyzer");
        },

        onRefreshDocuments: function () {
            this._loadDocuments();
            MessageToast.show("Documents refreshed");
        },

        onDocumentPress: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("documents");
            const documentId = oContext.getProperty("ID");

            MessageToast.show("Document selected: " + documentId);
            // TODO: Navigate to document details
        },

        onDeleteDocument: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("documents");
            const document = oContext.getObject();

            MessageBox.confirm(
                `Are you sure you want to delete "${document.title}"?`,
                {
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK) {
                            this._dataService.deleteDocument(document.ID);
                            MessageToast.show("Document deleted");
                        }
                    }
                }
            );
        },

        formatDate: function (date) {
            if (!date) return "";
            return new Date(date).toLocaleDateString();
        },

        formatStatus: function (status) {
            const statusMap = {
                "PROCESSED": "Success",
                "PROCESSING": "Warning",
                "ERROR": "Error",
                "UPLOADED": "Information"
            };
            return statusMap[status] || "None";
        },

        getStatusIcon: function (status) {
            const iconMap = {
                "PROCESSED": "sap-icon://accept",
                "PROCESSING": "sap-icon://pending",
                "ERROR": "sap-icon://error",
                "UPLOADED": "sap-icon://upload"
            };
            return iconMap[status] || "sap-icon://question-mark";
        },

        onExit: function () {
            if (this._dataService) {
                this._dataService.unsubscribe("DataService", "DataUpdated", this._onDataUpdated, this);
            }
        }
    });
});
