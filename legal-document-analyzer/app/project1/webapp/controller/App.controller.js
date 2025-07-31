sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("project1.controller.App", {
      onInit() {
          console.log("App Controller initialized");
      },

      onMenuButtonPress() {
          const sideNavigation = this.byId("sideNavigation");
          const expanded = sideNavigation.getExpanded();
          sideNavigation.setExpanded(!expanded);
      },

      onNavigationSelect(oEvent) {
          const selectedKey = oEvent.getParameter("item").getKey();
          const router = this.getOwnerComponent().getRouter();

          switch (selectedKey) {
              case "dashboard":
                  router.navTo("RouteDashboard");
                  break;
              case "documents":
                  router.navTo("RouteView1");
                  break;
              case "analytics":
                  // Navigate to analytics view when implemented
                  break;
              case "settings":
                  // Navigate to settings view when implemented
                  break;
              default:
                  router.navTo("RouteDashboard");
          }
      }
  });
});