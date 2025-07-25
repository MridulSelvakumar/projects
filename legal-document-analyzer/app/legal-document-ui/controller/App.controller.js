sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("legal.document.analyzer.ui.controller.App", {

        onInit: function () {
            // Initialize app-level settings
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
        },

        onUserSettings: function () {
            // Open user settings dialog
            sap.m.MessageToast.show("User settings functionality coming soon!");
        }
    });
});
