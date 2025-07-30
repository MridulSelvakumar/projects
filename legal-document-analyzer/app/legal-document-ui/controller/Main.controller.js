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
                selectedFile: null,
                fileName: "No file chosen",
                uploadEnabled: false,
                currentSection: "dashboard",
                activities: [
                    {
                        name: "Contract Review & Analysis",
                        description: "Complete all required legal forms, review contract terms and conditions",
                        category: "Legal",
                        priority: "High",
                        priorityState: "Error",
                        status: "Completed",
                        statusState: "Success",
                        date: "2024-01-16",
                        time: "120"
                    },
                    {
                        name: "Legal Document Training",
                        description: "Fundamentals: Training complete SAP Business Technology Platform",
                        category: "Learning",
                        priority: "High",
                        priorityState: "Error",
                        status: "In Progress",
                        statusState: "Warning",
                        date: "2024-01-20",
                        time: "240"
                    },
                    {
                        name: "Team Introduction Meeting",
                        description: "Meet with team members, understand processes and workflows",
                        category: "Meeting",
                        priority: "Medium",
                        priorityState: "Warning",
                        status: "Planned",
                        statusState: "None",
                        date: "2024-01-22",
                        time: "0"
                    }
                ],
                statistics: {
                    totalActivities: 3,
                    completed: 1,
                    inProgress: 1,
                    totalMinutes: 360
                }
            });
            this.getView().setModel(oLocalModel, "local");

            // Initialize the main model
            var oModel = this.getOwnerComponent().getModel();
            this.getView().setModel(oModel);

            // Show Dashboard section by default
            this._showSection("dashboard");
        },

        // Navigation handling
        onNavItemSelect: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            this._showSection(sKey);

            // Update local model
            var oLocalModel = this.getView().getModel("local");
            oLocalModel.setProperty("/currentSection", sKey);
        },

        onRefresh: function () {
            MessageToast.show("Refreshing data...");
        },

        onSettings: function () {
            MessageToast.show("Settings clicked");
        },

        // Activity Management Functions
        onAddActivity: function () {
            MessageToast.show("Add Activity functionality - Coming soon!");
        },

        onEditActivity: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("local");
            var sActivityName = oContext.getProperty("name");
            MessageToast.show("Edit activity: " + sActivityName);
        },

        onDeleteActivity: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("local");
            var sActivityName = oContext.getProperty("name");

            MessageBox.confirm("Are you sure you want to delete '" + sActivityName + "'?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show("Activity deleted: " + sActivityName);
                        // Here you would implement the actual deletion logic
                    }
                }
            });
        },

        // Document Upload Functions
        onChooseFile: function () {
            var oFileUploader = document.createElement("input");
            oFileUploader.type = "file";
            oFileUploader.accept = ".pdf,.docx,.txt";

            var that = this;
            oFileUploader.onchange = function (oEvent) {
                var file = oEvent.target.files[0];
                if (file) {
                    var oLocalModel = that.getView().getModel("local");
                    oLocalModel.setProperty("/selectedFile", file);
                    oLocalModel.setProperty("/fileName", file.name);
                    oLocalModel.setProperty("/uploadEnabled", true);
                }
            };

            oFileUploader.click();
        },

        onUploadDocument: function () {
            var oLocalModel = this.getView().getModel("local");
            var file = oLocalModel.getProperty("/selectedFile");
            var documentType = this.byId("documentTypeSelect").getSelectedKey();

            if (!file) {
                MessageBox.error("Please select a file first.");
                return;
            }

            MessageToast.show("Uploading document: " + file.name);

            // Simulate upload process
            var that = this;
            setTimeout(function () {
                MessageToast.show("Document uploaded successfully!");
                that._resetUploadForm();
                that._loadDocumentsForSelect();
            }, 2000);
        },

        _resetUploadForm: function () {
            var oLocalModel = this.getView().getModel("local");
            oLocalModel.setProperty("/selectedFile", null);
            oLocalModel.setProperty("/fileName", "No file chosen");
            oLocalModel.setProperty("/uploadEnabled", false);
        },

        _loadDocumentsForSelect: function () {
            // Mock documents for the select dropdown
            var oSelect = this.byId("documentSelect");
            oSelect.removeAllItems();

            // Add default option
            oSelect.addItem(new sap.ui.core.Item({
                key: "all",
                text: "Ask about all documents"
            }));

            // Add mock documents
            var mockDocs = [
                { id: "doc1", name: "Service Agreement.pdf" },
                { id: "doc2", name: "NDA Template.docx" },
                { id: "doc3", name: "Contract Terms.txt" }
            ];

            mockDocs.forEach(function (doc) {
                oSelect.addItem(new sap.ui.core.Item({
                    key: doc.id,
                    text: doc.name
                }));
            });
        },

        // AI Assistant Functions
        onAskQuestion: function () {
            var sQuestion = this.byId("questionInput").getValue();
            var sDocumentId = this.byId("documentSelect").getSelectedKey();

            if (!sQuestion.trim()) {
                MessageBox.error("Please enter a question.");
                return;
            }

            MessageToast.show("Processing your question with AI...");

            // Simulate AI processing
            var that = this;
            setTimeout(function () {
                that._showAIResponse(sQuestion, sDocumentId);
            }, 2000);
        },

        _showAIResponse: function (sQuestion, sDocumentId) {
            var sResponse = this._generateMockAIResponse(sQuestion);

            MessageBox.information(sResponse, {
                title: "AI Assistant Response",
                contentWidth: "500px",
                actions: [MessageBox.Action.OK, "Helpful", "Not Helpful"],
                onClose: function (sAction) {
                    if (sAction === "Helpful" || sAction === "Not Helpful") {
                        MessageToast.show("Thank you for your feedback: " + sAction);
                    }
                }
            });
        },

        _generateMockAIResponse: function (sQuestion) {
            var sQuestionLower = sQuestion.toLowerCase();

            if (sQuestionLower.includes("liability")) {
                return "Based on the document analysis, the liability clause limits damages to direct damages only, excluding consequential or indirect damages. The liability cap is typically set at the contract value or a specified amount.";
            } else if (sQuestionLower.includes("termination")) {
                return "The termination clause allows either party to terminate the agreement with 30 days written notice. Immediate termination is permitted in case of material breach or insolvency.";
            } else if (sQuestionLower.includes("payment")) {
                return "Payment terms require invoices to be paid within 30 days of receipt. Late payments may incur interest charges at 1.5% per month or the maximum rate permitted by law.";
            } else if (sQuestionLower.includes("confidential")) {
                return "The confidentiality clause requires both parties to protect proprietary information for a period of 5 years after agreement termination. This includes technical data, business plans, and customer information.";
            } else {
                return "Based on the document analysis: " + sQuestion + "\n\nThis is a demonstration of the AI-powered legal document analysis capability. The system uses RAG (Retrieval-Augmented Generation) to provide contextual answers based on your uploaded documents.";
            }
        },

        onLoadDocuments: function () {
            MessageToast.show("Loading documents for Q&A...");
            this._loadDocumentsForSelect();
        },

        onViewUploaded: function () {
            MessageToast.show("Viewing uploaded documents...");
        },

        onViewAnalytics: function () {
            MessageToast.show("Opening analytics dashboard...");
        },

        _showSection: function (sSection) {
            // Hide all sections first
            this.byId("uploadSection").setVisible(false);
            this.byId("assistantSection").setVisible(false);
            this.byId("analyticsSection").setVisible(false);
            this.byId("dashboardSection").setVisible(false);
            this.byId("settingsSection").setVisible(false);

            // Show selected section
            switch (sSection) {
                case "upload":
                    this.byId("uploadSection").setVisible(true);
                    break;
                case "assistant":
                    this.byId("assistantSection").setVisible(true);
                    break;
                case "analytics":
                    this.byId("analyticsSection").setVisible(true);
                    break;
                case "dashboard":
                    this.byId("dashboardSection").setVisible(true);
                    break;
                case "settings":
                    this.byId("settingsSection").setVisible(true);
                    break;
            }
        },

        // File handling
        onChooseFile: function () {
            var oFileUploader = document.createElement("input");
            oFileUploader.type = "file";
            oFileUploader.accept = ".pdf,.docx,.txt";

            oFileUploader.onchange = function(oEvent) {
                var oFile = oEvent.target.files[0];
                if (oFile) {
                    var oLocalModel = this.getView().getModel("local");
                    oLocalModel.setProperty("/selectedFile", oFile);
                    oLocalModel.setProperty("/fileName", oFile.name);
                    oLocalModel.setProperty("/uploadEnabled", true);

                    this.byId("fileNameText").setText(oFile.name);
                    this.byId("uploadDocumentBtn").setEnabled(true);
                }
            }.bind(this);

            oFileUploader.click();
        },

        onUploadDocument: function () {
            var oLocalModel = this.getView().getModel("local");
            var oFile = oLocalModel.getProperty("/selectedFile");
            var sDocumentType = this.byId("documentTypeSelect").getSelectedKey();

            if (!oFile) {
                MessageBox.error("Please select a file first");
                return;
            }

            // Call upload action
            var oModel = this.getView().getModel();
            var oBinding = oModel.bindContext("/uploadDocument(...)");
            oBinding.setParameter("fileName", oFile.name);
            oBinding.setParameter("documentType", sDocumentType);

            oBinding.execute().then(function () {
                var oResult = oBinding.getBoundContext().getObject();
                if (oResult.success) {
                    MessageToast.show("Document uploaded successfully!");
                    // Reset form
                    oLocalModel.setProperty("/selectedFile", null);
                    oLocalModel.setProperty("/fileName", "No file chosen");
                    oLocalModel.setProperty("/uploadEnabled", false);
                    this.byId("fileNameText").setText("No file chosen");
                    this.byId("uploadDocumentBtn").setEnabled(false);
                } else {
                    MessageBox.error("Upload failed: " + oResult.message);
                }
            }.bind(this)).catch(function (error) {
                console.error("Upload error:", error);
                MessageBox.error("Failed to upload document. Please try again.");
            });
        },

        onViewUploaded: function () {
            MessageToast.show("Opening document list...");
            // Could navigate to a document list view
        },

        onViewAnalytics: function () {
            MessageToast.show("Opening analytics dashboard...");
            // Could navigate to analytics view
        },

        onAskQuestion: function () {
            var sQuestion = this.byId("questionInput").getValue();
            var sDocument = this.byId("documentSelect").getSelectedKey();

            if (!sQuestion.trim()) {
                MessageBox.error("Please enter a question");
                return;
            }

            // Call askQuestion action
            var oModel = this.getView().getModel();
            var oBinding = oModel.bindContext("/askQuestion(...)");
            oBinding.setParameter("documentId", sDocument === "all" ? "" : sDocument);
            oBinding.setParameter("question", sQuestion);
            oBinding.setParameter("queryType", "GENERAL");

            oBinding.execute().then(function () {
                var oResult = oBinding.getBoundContext().getObject();
                var sResponse = oResult.response || "I received your question but couldn't generate a response.";

                MessageBox.information(sResponse, {
                    title: "AI Response"
                });

                // Clear the question
                this.byId("questionInput").setValue("");
            }.bind(this)).catch(function (error) {
                console.error("AI service error:", error);
                MessageBox.error("Sorry, I'm having trouble connecting to the AI service. Please try again.");
            });
        },

        onLoadDocuments: function () {
            MessageToast.show("Loading documents for Q&A...");
            // Could load available documents into the select
        },

        // Utility methods
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        }
    });
});
