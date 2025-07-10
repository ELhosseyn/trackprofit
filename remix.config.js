// Import router future flags
const { getRouterFutureConfig } = require('./app/config/router-config');

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server. The CLI will eventually
// stop passing in HOST, so we can remove this workaround after the next major release.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  serverModuleFormat: "esm", // Changed to ESM for better compatibility
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  dev: { port: process.env.HMR_SERVER_PORT || 8002 },
  future: {
    ...getRouterFutureConfig(),
    v2_dev: true,
    v2_headers: true,
    v3_fetcherPersist: true,
    v3_lazyRouteDiscovery: true,
    v3_relativeSplatPath: true,
    v3_singleFetch: true,
    v3_throwAbortReason: true,
  },
  serverDependenciesToBundle: [
    /^chart.js/,
    /^react-chartjs-2/,
    /^recharts/,
    /^d3/,
  ],
  routes(defineRoutes) {
    return defineRoutes((route) => {
      // Define explicit lazy-loaded routes here if needed
    });
  },
};
