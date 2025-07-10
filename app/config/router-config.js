/**
 * React Router Configuration
 * 
 * This file sets up the React Router configuration and future flags.
 */

import { createBrowserRouter } from "react-router-dom";

/**
 * Configure router with future flags to address warnings and prepare for v7
 * 
 * @param {Array} routes The routes array to configure
 * @returns {Object} Configured router
 */
export function configureRouter(routes) {
  return createBrowserRouter(routes, {
    future: {
      // Enable v7 features and suppress warnings
      v7_normalizeFormMethod: true,
      v7_relativeSplatPath: true,
      v7_prependBasename: true
    }
  });
}

/**
 * Get future flags configuration for Remix
 * @returns {Object} Future flags configuration
 */
export function getRouterFutureConfig() {
  return {
    v2_errorBoundary: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
    unstable_cssModules: true,
    unstable_vanillaExtract: true,
    v7_relativeSplatPath: true
  };
}
