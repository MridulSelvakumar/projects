sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel"
], function (UIComponent, JSONModel, ODataModel) {
    "use strict";

    return UIComponent.extend("legal.document.analyzer.ui.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            // Call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // Initialize the router
            this.getRouter().initialize();

            // Set up models
            this._setupModels();
        },

        _setupModels: function () {
            // Create a JSON model for local data
            var oLocalModel = new JSONModel({
                busy: false,
                documents: [],
                currentUser: "Legal Analyst"
            });
            this.setModel(oLocalModel, "local");

            // Set up OData model for CAP service
            var oODataModel = new ODataModel({
                serviceUrl: "/legal-documents/",
                synchronizationMode: "None",
                operationMode: "Server",
                autoExpandSelect: true,
                earlyRequests: true
            });
            this.setModel(oODataModel);
        },

        getContentDensityClass: function () {
            if (this._sContentDensityClass === undefined) {
                // Check whether FLP has already set the content density class
                if (document.body.classList.contains("sapUiSizeCozy") || 
                    document.body.classList.contains("sapUiSizeCompact")) {
                    this._sContentDensityClass = "";
                } else if (!sap.ui.Device.support.touch) {
                    // Apply "compact" mode if touch is not supported
                    this._sContentDensityClass = "sapUiSizeCompact";
                } else {
                    // "cozy" in case of touch support; default for most sap.m controls
                    this._sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this._sContentDensityClass;
        }
    });
});
