sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/m/FormattedText"
], function (Controller, MessageToast, MessageBox, Fragment, JSONModel, VBox, Text, FormattedText) {
    "use strict";

    return Controller.extend("legal.document.analyzer.ui.controller.Main", {

        onInit: function () {
            // Initialize local model for UI state
            var oLocalModel = new JSONModel({
                selectedDocument: null,
                chatInput: "",
                chatMessages: []
            });
            this.getView().setModel(oLocalModel, "local");
            
            // Initialize chat messages container
            this._initializeChatMessages();
        },

        onUploadPress: function () {
            var oUploadSet = this.byId("uploadSet");
            oUploadSet.getDefaultFileUploader().click();
        },

        onUploadCompleted: function (oEvent) {
            var oUploadSet = this.byId("uploadSet");
            var aItems = oUploadSet.getItems();
            
            aItems.forEach(function (oItem) {
                if (oItem.getUploadState() === "Complete") {
                    this._processUploadedFile(oItem);
                }
            }.bind(this));
            
            // Refresh documents table
            this._refreshDocuments();
            MessageToast.show(this.getResourceBundle().getText("documentUploadedSuccessfully"));
        },

        onFileDeleted: function (oEvent) {
            MessageToast.show(this.getResourceBundle().getText("fileDeleted"));
        },

        onFileSizeExceeded: function (oEvent) {
            MessageToast.show(this.getResourceBundle().getText("fileSizeExceeded"));
        },

        onFileTypeMismatch: function (oEvent) {
            MessageToast.show(this.getResourceBundle().getText("fileTypeMismatch"));
        },

        onDocumentSelect: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oContext = oSelectedItem.getBindingContext();
            var oDocument = oContext.getObject();
            
            // Set selected document in local model
            this.getView().getModel("local").setProperty("/selectedDocument", oDocument);
            
            // Clear previous chat messages
            this._clearChatMessages();
            
            // Add welcome message
            this._addChatMessage("assistant", 
                this.getResourceBundle().getText("welcomeMessage", [oDocument.title]));
        },

        onDocumentPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sDocumentId = oContext.getProperty("ID");
            
            // Navigate to document detail view
            this.getRouter().navTo("DocumentDetail", {
                documentId: sDocumentId
            });
        },

        onViewDetails: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sDocumentId = oContext.getProperty("ID");
            
            this.getRouter().navTo("DocumentDetail", {
                documentId: sDocumentId
            });
        },

        onDeleteDocument: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sDocumentTitle = oContext.getProperty("title");
            
            MessageBox.confirm(
                this.getResourceBundle().getText("confirmDeleteDocument", [sDocumentTitle]),
                {
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._deleteDocument(oContext);
                        }
                    }.bind(this)
                }
            );
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("documentsTable");
            var oBinding = oTable.getBinding("items");
            
            if (sQuery) {
                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("title", sap.ui.model.FilterOperator.Contains, sQuery),
                        new sap.ui.model.Filter("documentType", sap.ui.model.FilterOperator.Contains, sQuery)
                    ],
                    and: false
                });
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },

        onSendMessage: function () {
            var oLocalModel = this.getView().getModel("local");
            var sMessage = oLocalModel.getProperty("/chatInput");
            var oSelectedDocument = oLocalModel.getProperty("/selectedDocument");
            
            if (!sMessage.trim()) {
                return;
            }
            
            if (!oSelectedDocument) {
                MessageToast.show(this.getResourceBundle().getText("selectDocumentFirst"));
                return;
            }
            
            // Add user message to chat
            this._addChatMessage("user", sMessage);
            
            // Clear input
            oLocalModel.setProperty("/chatInput", "");
            
            // Show typing indicator
            this._showTypingIndicator();
            
            // Send question to AI service
            this._sendQuestionToAI(oSelectedDocument.ID, sMessage);
        },

        onQuickQuestion: function (oEvent) {
            var sQuestion = oEvent.getSource().getText();
            var oLocalModel = this.getView().getModel("local");
            
            // Set the question in input and send
            oLocalModel.setProperty("/chatInput", sQuestion);
            this.onSendMessage();
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

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        // Private methods
        _processUploadedFile: function (oItem) {
            var oDocumentTypeSelect = this.byId("documentTypeSelect");
            var sDocumentType = oDocumentTypeSelect.getSelectedKey();
            
            // Create document entry via OData service
            var oModel = this.getView().getModel();
            var oData = {
                title: oItem.getFileName().replace(/\.[^/.]+$/, ""),
                fileName: oItem.getFileName(),
                documentType: sDocumentType,
                status: "UPLOADED"
            };
            
            oModel.create("/Documents", oData, {
                success: function () {
                    MessageToast.show(this.getResourceBundle().getText("documentCreatedSuccessfully"));
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(this.getResourceBundle().getText("documentCreationFailed"));
                }.bind(this)
            });
        },

        _refreshDocuments: function () {
            var oModel = this.getView().getModel();
            oModel.refresh();
        },

        _deleteDocument: function (oContext) {
            var oModel = this.getView().getModel();
            
            oModel.remove(oContext.getPath(), {
                success: function () {
                    MessageToast.show(this.getResourceBundle().getText("documentDeletedSuccessfully"));
                }.bind(this),
                error: function () {
                    MessageBox.error(this.getResourceBundle().getText("documentDeletionFailed"));
                }.bind(this)
            });
        },

        _initializeChatMessages: function () {
            var oChatContainer = this.byId("chatMessages");
            oChatContainer.removeAllItems();
        },

        _clearChatMessages: function () {
            var oChatContainer = this.byId("chatMessages");
            oChatContainer.removeAllItems();
        },

        _addChatMessage: function (sRole, sMessage) {
            var oChatContainer = this.byId("chatMessages");
            var sClass = sRole === "user" ? "userMessage" : "assistantMessage";
            
            var oMessageBox = new VBox({
                class: "chatMessage " + sClass
            });
            
            var oMessageText = new FormattedText({
                htmlText: sMessage,
                class: "messageText"
            });
            
            oMessageBox.addItem(oMessageText);
            oChatContainer.addItem(oMessageBox);
            
            // Scroll to bottom
            setTimeout(function () {
                var oChatScrollContainer = this.byId("chatContainer");
                oChatScrollContainer.scrollTo(0, oChatScrollContainer.getDomRef().scrollHeight);
            }.bind(this), 100);
        },

        _showTypingIndicator: function () {
            this._addChatMessage("assistant", "<em>Typing...</em>");
        },

        _removeTypingIndicator: function () {
            var oChatContainer = this.byId("chatMessages");
            var aItems = oChatContainer.getItems();
            var oLastItem = aItems[aItems.length - 1];
            
            if (oLastItem && oLastItem.getItems()[0].getHtmlText().includes("Typing...")) {
                oChatContainer.removeItem(oLastItem);
            }
        },

        _sendQuestionToAI: function (sDocumentId, sQuestion) {
            var oModel = this.getView().getModel();
            
            // Call the askQuestion action
            oModel.callFunction("/askQuestion", {
                method: "POST",
                urlParameters: {
                    documentId: sDocumentId,
                    question: sQuestion,
                    queryType: "GENERAL"
                },
                success: function (oData) {
                    this._removeTypingIndicator();
                    this._addChatMessage("assistant", oData.response);
                }.bind(this),
                error: function (oError) {
                    this._removeTypingIndicator();
                    this._addChatMessage("assistant", 
                        this.getResourceBundle().getText("aiErrorMessage"));
                }.bind(this)
            });
        }
    });
});
