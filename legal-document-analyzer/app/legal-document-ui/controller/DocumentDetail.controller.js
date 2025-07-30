sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("legal.document.analyzer.ui.controller.DocumentDetail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("DocumentDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteMain", {}, true);
            }
        },

        onProcessDocument: function () {
            var oContext = this.getView().getBindingContext();
            var sDocumentId = oContext.getProperty("ID");
            var sTitle = oContext.getProperty("title");

            MessageBox.confirm(
                this.getResourceBundle().getText("confirmProcessDocument", [sTitle]),
                {
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._processDocument(sDocumentId);
                        }
                    }.bind(this)
                }
            );
        },

        onExportDocument: function () {
            var oContext = this.getView().getBindingContext();
            var sDocumentId = oContext.getProperty("ID");
            
            // Call export action
            this._exportDocument(sDocumentId, "JSON");
        },

        formatStatus: function (sStatus) {
            switch (sStatus) {
                case "PROCESSED":
                    return "Success";
                case "PROCESSING":
                    return "Warning";
                case "ERROR":
                    return "Error";
                default:
                    return "None";
            }
        },

        formatFileSize: function (iSize) {
            if (!iSize) return "0 B";
            
            var sizes = ['B', 'KB', 'MB', 'GB'];
            var i = Math.floor(Math.log(iSize) / Math.log(1024));
            return Math.round(iSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        },

        formatConfidence: function (fConfidence) {
            if (!fConfidence) return "0%";
            return Math.round(fConfidence * 100) + "%";
        },

        formatConfidencePercent: function (fConfidence) {
            if (!fConfidence) return 0;
            return fConfidence * 100;
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        // Private methods
        _onObjectMatched: function (oEvent) {
            var sDocumentId = oEvent.getParameter("arguments").documentId;
            var sObjectPath = "/Documents('" + sDocumentId + "')";
            
            this.getView().bindElement({
                path: sObjectPath,
                parameters: {
                    $expand: "clauses,parties"
                }
            });
        },

        _processDocument: function (sDocumentId) {
            var oModel = this.getView().getModel();
            
            // Update status to processing
            var oContext = this.getView().getBindingContext();
            oContext.setProperty("status", "PROCESSING");
            
            // Call process document action
            var oBinding = oModel.bindContext("/Documents('" + sDocumentId + "')/processDocument");
            var oAction = oBinding.execute();
            
            oAction.then(function (oResult) {
                MessageToast.show(this.getResourceBundle().getText("documentProcessingStarted"));
                
                // Refresh the binding to get updated data
                this.getView().getElementBinding().refresh();
            }.bind(this)).catch(function (oError) {
                MessageBox.error(this.getResourceBundle().getText("documentProcessingFailed"));
                console.error("Document processing error:", oError);
                
                // Reset status
                oContext.setProperty("status", "UPLOADED");
            }.bind(this));
        },

        _exportDocument: function (sDocumentId, sFormat) {
            var oModel = this.getView().getModel();
            
            // Call export action
            var oBinding = oModel.bindContext("/exportDocumentData");
            var oAction = oBinding.execute({
                documentId: sDocumentId,
                format: sFormat
            });
            
            oAction.then(function (oResult) {
                // Handle the exported data
                var oData = oResult.getObject();
                this._downloadFile(oData, sDocumentId + "_export." + sFormat.toLowerCase());
                
                MessageToast.show(this.getResourceBundle().getText("documentExportedSuccessfully"));
            }.bind(this)).catch(function (oError) {
                MessageBox.error(this.getResourceBundle().getText("documentExportFailed"));
                console.error("Document export error:", oError);
            }.bind(this));
        },

        _downloadFile: function (oData, sFileName) {
            // Create a blob and download link
            var sContent = typeof oData === 'string' ? oData : JSON.stringify(oData, null, 2);
            var oBlob = new Blob([sContent], { type: 'application/octet-stream' });
            var sUrl = URL.createObjectURL(oBlob);
            
            var oLink = document.createElement('a');
            oLink.href = sUrl;
            oLink.download = sFileName;
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
            URL.revokeObjectURL(sUrl);
        }
    });
});
