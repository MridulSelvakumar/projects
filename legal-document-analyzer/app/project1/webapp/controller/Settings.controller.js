sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/resource/ResourceModel"
], (BaseController, JSONModel, MessageToast, MessageBox, Fragment, ResourceModel) => {
    "use strict";

    return BaseController.extend("project1.controller.Settings", {
        onInit() {
            console.log("Settings Controller initialized");
            this._initializeSettings();
            this._loadSystemInfo();
            this._applyStoredLanguage();
        },

        _initializeSettings() {
            // Load settings from localStorage or use defaults
            const savedSettings = localStorage.getItem("legalDocAnalyzerSettings");
            let settingsData;

            if (savedSettings) {
                settingsData = JSON.parse(savedSettings);
            } else {
                // Default settings
                settingsData = {
                    // General Settings
                    theme: "sap_horizon",
                    language: "en",
                    autoSave: true,

                    // AI Analysis Settings
                    confidenceThreshold: 85,
                    maxFileSize: 50,
                    enableOCR: true,
                    enableBatchProcessing: false,

                    // AI Model Configuration
                    aiService: "enterprise",
                    modelTemperature: 0.7,
                    maxTokens: 4000,
                    enableRAG: true,
                    enableCaching: true,

                    // Performance & Monitoring
                    queueSize: 100,
                    concurrentLimit: 5,
                    enableMetrics: true,
                    enableDebugLogging: false,

                    // Security Settings
                    encryptData: true,
                    logAnalysis: true,
                    shareAnalytics: false,
                    retentionPeriod: 90,

                    // Notification Settings
                    emailNotifications: true,
                    notifyAnalysisComplete: true,
                    notifyErrors: true,
                    emailAddress: "",
                    notificationFrequency: "immediate",

                    // Backup & Data Management
                    backupFrequency: "weekly",
                    backupLocation: "/backup/legal-docs",
                    compressBackups: true,
                    encryptBackups: true,

                    // Settings Management
                    configProfile: "default",

                    // System Information (will be loaded dynamically)
                    systemInfo: {
                        appVersion: "1.0.0",
                        dbStatus: "Connected",
                        aiStatus: "Online",
                        totalDocuments: 0,
                        storageUsed: "0 MB",
                        lastBackup: "Never"
                    }
                };
            }

            const model = new JSONModel(settingsData);
            this.getView().setModel(model);
        },

        _applyStoredLanguage() {
            // Apply the stored language preference
            const model = this.getView().getModel();
            const storedLanguage = model.getProperty("/language");

            if (storedLanguage && storedLanguage !== "en") {
                this._changeLanguage(storedLanguage);
            }
        },

        _loadSystemInfo() {
            var that = this;

            // Load real system information
            this._loadDocumentCount();
            this._checkAIServiceStatus();
            this._loadStorageInfo();
        },

        _loadDocumentCount() {
            var that = this;
            jQuery.ajax({
                url: "/legal-documents/Documents?$count=true",
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                success: function (data) {
                    var count = data["@odata.count"] || 0;
                    that.getView().getModel().setProperty("/systemInfo/totalDocuments", count);
                },
                error: function () {
                    that.getView().getModel().setProperty("/systemInfo/totalDocuments", "Error");
                }
            });
        },

        _checkAIServiceStatus() {
            var that = this;
            // Simulate AI service status check
            setTimeout(function() {
                that.getView().getModel().setProperty("/systemInfo/aiStatus", "Online");
            }, 1000);
        },

        _loadStorageInfo() {
            var that = this;
            // Simulate storage calculation
            setTimeout(function() {
                that.getView().getModel().setProperty("/systemInfo/storageUsed", "125 MB");
                that.getView().getModel().setProperty("/systemInfo/lastBackup", "2024-07-30 14:30");
            }, 1500);
        },

        onThemeChange(oEvent) {
            const selectedTheme = oEvent.getParameter("selectedItem").getKey();

            // Apply theme change
            sap.ui.getCore().applyTheme(selectedTheme);

            // Get i18n model for localized message
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const sMessage = oResourceBundle.getText("themeChanged", [selectedTheme]);
            MessageToast.show(sMessage);
        },

        onLanguageChange(oEvent) {
            const selectedLanguage = oEvent.getParameter("selectedItem").getKey();

            // Update the i18n model with the new language
            this._changeLanguage(selectedLanguage);

            // Get localized message (will be in the new language)
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const sMessage = oResourceBundle.getText("languageChanged", [selectedLanguage]);
            MessageToast.show(sMessage);
        },

        _changeLanguage(sLanguage) {
            // Create new resource bundle with the selected language
            const oResourceModel = new ResourceModel({
                bundleName: "project1.i18n.i18n",
                bundleLocale: sLanguage
            });

            // Set the new model to the core (affects all views)
            sap.ui.getCore().setModel(oResourceModel, "i18n");

            // Update the current view's model
            this.getView().setModel(oResourceModel, "i18n");

            // Store language preference
            const model = this.getView().getModel();
            model.setProperty("/language", sLanguage);

            // Save to localStorage
            const settings = model.getData();
            localStorage.setItem("legalDocAnalyzerSettings", JSON.stringify(settings));
        },

        onAIServiceChange(oEvent) {
            const selectedService = oEvent.getParameter("selectedItem").getKey();
            MessageToast.show("AI Service changed to " + selectedService);

            // Update model temperature and tokens based on service
            const model = this.getView().getModel();
            switch(selectedService) {
                case "enterprise":
                    model.setProperty("/modelTemperature", 0.7);
                    model.setProperty("/maxTokens", 4000);
                    break;
                case "genai":
                    model.setProperty("/modelTemperature", 0.8);
                    model.setProperty("/maxTokens", 8000);
                    break;
                case "basic":
                    model.setProperty("/modelTemperature", 0.5);
                    model.setProperty("/maxTokens", 2000);
                    break;
            }
        },

        onTestAIConnection() {
            var that = this;
            MessageToast.show("Testing AI connection...");

            // Simulate AI connection test
            setTimeout(function() {
                MessageBox.success("AI connection test successful!\n\nService: Enterprise AI\nLatency: 245ms\nStatus: Online");
            }, 2000);
        },

        onViewModelStatus() {
            MessageBox.information(
                "AI Model Status:\n\n" +
                "• Primary Model: GPT-4 Enterprise\n" +
                "• Backup Model: Claude-3 Sonnet\n" +
                "• RAG Database: Connected\n" +
                "• Cache Hit Rate: 78%\n" +
                "• Average Response Time: 1.2s\n" +
                "• Requests Today: 1,247\n" +
                "• Success Rate: 99.8%",
                {
                    title: "AI Model Status"
                }
            );
        },

        onViewSystemStatus() {
            var systemStatus =
                "System Performance:\n\n" +
                "• CPU Usage: 23%\n" +
                "• Memory Usage: 1.2GB / 4GB\n" +
                "• Disk Usage: 45GB / 100GB\n" +
                "• Active Connections: 12\n" +
                "• Queue Length: 3 documents\n" +
                "• Processing Rate: 2.3 docs/min\n" +
                "• Uptime: 7 days, 14 hours\n" +
                "• Last Restart: 2024-07-23 09:15";

            MessageBox.information(systemStatus, {
                title: "System Status"
            });
        },

        onClearCache() {
            var that = this;
            MessageBox.confirm("Clear all cached data? This may temporarily slow down responses.", {
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show("Cache cleared successfully");
                        // Simulate cache clearing
                        that._loadSystemInfo();
                    }
                }
            });
        },

        onExportLogs() {
            MessageToast.show("Exporting system logs...");

            // Simulate log export
            setTimeout(function() {
                MessageToast.show("Logs exported to downloads folder");
            }, 2000);
        },

        onCreateBackup() {
            var that = this;
            MessageBox.confirm("Create a backup of all documents and settings?", {
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show("Creating backup...");

                        setTimeout(function() {
                            MessageToast.show("Backup created successfully!");
                            that.getView().getModel().setProperty("/systemInfo/lastBackup", new Date().toLocaleString());
                        }, 3000);
                    }
                }
            });
        },

        onRestoreBackup() {
            MessageBox.confirm(
                "Restore from backup? This will replace all current data.",
                {
                    title: "Restore Backup",
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            MessageToast.show("Restore functionality would be implemented here");
                        }
                    }
                }
            );
        },

        onCleanOldData() {
            var that = this;
            MessageBox.confirm(
                "Delete documents older than the retention period (90 days)?",
                {
                    title: "Clean Old Data",
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            MessageToast.show("Cleaning old data...");

                            setTimeout(function() {
                                MessageToast.show("Cleaned 15 old documents, freed 2.3GB");
                                that._loadSystemInfo();
                            }, 2000);
                        }
                    }
                }
            );
        },

        onExportSettings() {
            const model = this.getView().getModel();
            const settings = model.getData();

            // Remove system info from export
            const exportData = { ...settings };
            delete exportData.systemInfo;

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            // Create download link
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'legal-analyzer-settings.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            MessageToast.show("Settings exported successfully");
        },

        onImportSettings() {
            var that = this;

            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const importedSettings = JSON.parse(e.target.result);

                            MessageBox.confirm("Import these settings? Current settings will be overwritten.", {
                                onClose: function(sAction) {
                                    if (sAction === MessageBox.Action.OK) {
                                        // Merge with current system info
                                        const currentModel = that.getView().getModel();
                                        const currentSystemInfo = currentModel.getProperty("/systemInfo");

                                        importedSettings.systemInfo = currentSystemInfo;

                                        currentModel.setData(importedSettings);
                                        MessageToast.show("Settings imported successfully");
                                    }
                                }
                            });
                        } catch (error) {
                            MessageBox.error("Invalid settings file format");
                        }
                    };
                    reader.readAsText(file);
                }
            };

            input.click();
        },

        onConfigProfileChange(oEvent) {
            const selectedProfile = oEvent.getParameter("selectedItem").getKey();
            const model = this.getView().getModel();

            // Apply profile-specific settings
            switch(selectedProfile) {
                case "development":
                    model.setProperty("/enableDebugLogging", true);
                    model.setProperty("/enableMetrics", true);
                    model.setProperty("/confidenceThreshold", 70);
                    break;
                case "production":
                    model.setProperty("/enableDebugLogging", false);
                    model.setProperty("/enableMetrics", false);
                    model.setProperty("/confidenceThreshold", 90);
                    model.setProperty("/encryptData", true);
                    break;
                case "custom":
                    // Keep current settings
                    break;
                default: // default
                    this._initializeSettings();
                    break;
            }

            MessageToast.show("Configuration profile changed to " + selectedProfile);
        },

        onRefreshSystemInfo() {
            MessageToast.show("Refreshing system information...");
            this._loadSystemInfo();
        },

        onAdvancedSettings() {
            MessageBox.information(
                "Advanced Settings:\n\n" +
                "• API Rate Limiting: 1000 req/hour\n" +
                "• Database Connection Pool: 10 connections\n" +
                "• Session Timeout: 30 minutes\n" +
                "• File Upload Timeout: 5 minutes\n" +
                "• Maximum Concurrent Users: 50\n" +
                "• Log Rotation: Daily\n" +
                "• Health Check Interval: 30 seconds\n\n" +
                "Contact administrator for modifications.",
                {
                    title: "Advanced Settings"
                }
            );
        },

        onShowHelp() {
            MessageBox.information(
                "Legal Document Analyzer Help:\n\n" +
                "• Upload documents in PDF, DOCX, or TXT format\n" +
                "• Ask questions about your documents using AI\n" +
                "• View analytics and insights in the Dashboard\n" +
                "• Manage documents in the Documents section\n" +
                "• Configure settings for optimal performance\n\n" +
                "For technical support:\n" +
                "Email: support@legal-analyzer.com\n" +
                "Documentation: docs.legal-analyzer.com",
                {
                    title: "Help & Documentation"
                }
            );
        },

        onSaveSettings() {
            const model = this.getView().getModel();
            const settings = model.getData();

            // Save to localStorage
            localStorage.setItem("legalDocAnalyzerSettings", JSON.stringify(settings));

            // Here you would typically save to backend
            console.log("Saving settings:", settings);

            // Apply theme if changed
            sap.ui.getCore().applyTheme(settings.theme);

            MessageToast.show("Settings saved successfully!");
        },

        onResetSettings() {
            var that = this;
            MessageBox.confirm("Reset all settings to default values?", {
                onClose: function(sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        // Clear localStorage
                        localStorage.removeItem("legalDocAnalyzerSettings");

                        // Reset to default values
                        that._initializeSettings();
                        MessageToast.show("Settings reset to defaults");
                    }
                }
            });
        }
    });
});
