sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("project1.controller.View1", {
        onInit() {
            console.log("View1 Controller initialized");
        },

        onNavBack() {
            const router = this.getOwnerComponent().getRouter();
            router.navTo("RouteDashboard");
        }
    });
});