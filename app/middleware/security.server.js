/**
 * Security Middleware for TrackProfit
 * 
 * This middleware adds various security headers to our application:
 * - Content Security Policy (CSP)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - Referrer-Policy
 * - Permissions-Policy (replacing Feature-Policy)
 */

/**
 * Adds security headers to all responses
 * @param {Request} request The incoming request
 * @param {Response} response The outgoing response
 */
export function addSecurityHeaders(request, response) {
  // Content Security Policy
  // Customize these directives based on your app's needs
  const isDev = process.env.NODE_ENV !== 'production';
  // Allow Vite dev server websocket and assets in development
  const viteDevSrc = isDev ? " http://localhost:* ws://localhost:* wss://localhost:*" : "";
  const cspDirectives = [
    "default-src 'self'",
    // Scripts - allow from self, Shopify CDNs, Tawk.to, and inline scripts needed for Shopify
    "script-src 'self' https://cdn.shopify.com https://*.shopifycloud.com https://*.tawk.to 'unsafe-inline' 'unsafe-eval'" + viteDevSrc,
    // Styles - allow from self, Shopify CDNs, Tawk.to, and inline styles
    "style-src 'self' https://cdn.shopify.com https://*.shopifycloud.com https://*.tawk.to 'unsafe-inline'" + viteDevSrc,
    // Images - allow from self, Shopify domains, Tawk.to, and data URIs
    "img-src 'self' https://cdn.shopify.com https://*.shopifycloud.com https://*.tawk.to data: blob:",
    // Fonts - allow from self, Shopify CDNs, and Tawk.to
    "font-src 'self' https://cdn.shopify.com https://*.shopifycloud.com https://*.tawk.to",
    // Connect - allow APIs and websockets, including Tawk.to and Vite in dev
    "connect-src 'self' https://*.shopify.com https://*.shopifycloud.com wss://*.shopifycloud.com https://*.tawk.to wss://*.tawk.to" + viteDevSrc,
    // Frame sources - needed for Shopify embeds and Tawk.to chat widget
    "frame-src 'self' https://*.shopify.com https://*.shopifycloud.com https://*.tawk.to",
    // Media sources
    "media-src 'self'",
    // Object sources (PDFs, etc)
    "object-src 'none'",
    // Manifest sources for PWA
    "manifest-src 'self'",
    // Prefetch and DNS
    "prefetch-src 'self' https://cdn.shopify.com",
    "dns-prefetch-src 'self' https://cdn.shopify.com",
    // Worker sources
    "worker-src 'self' blob:",
    // Base URI restriction
    "base-uri 'self'",
    // Form actions
    "form-action 'self' https://*.shopify.com",
    // Frame ancestors (who can embed this site)
    "frame-ancestors 'self' https://*.shopify.com https://*.myshopify.com",
    // Block use of document.write()
    "require-trusted-types-for 'script'"
  ].join("; ");

  // Permissions Policy (replacing Feature Policy)
  const permissionsPolicy = [
    "accelerometer=()","autoplay=()", 
    "camera=()", "display-capture=()", 
    "document-domain=(self)", "encrypted-media=()", 
    "fullscreen=(self)", "geolocation=()", 
    "gyroscope=()", "magnetometer=()", 
    "microphone=()", "midi=()", 
    "payment=()", "picture-in-picture=(self)", 
    "publickey-credentials-get=()", "screen-wake-lock=()", 
    "sync-xhr=(self)", "usb=()", 
    "web-share=(self)", "xr-spatial-tracking=()",
    "clipboard-read=(self)", "clipboard-write=(self)"
  ].join(", ");

  // Add security headers to the response
  response.headers.set("Content-Security-Policy", cspDirectives);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", permissionsPolicy);
  
  // Only add Report-To header on Chromium browsers
  const userAgent = request.headers.get("User-Agent") || "";
  if (userAgent.includes("Chrome") || userAgent.includes("Edge")) {
    const reportToHeader = JSON.stringify({
      "group": "default",
      "max_age": 86400,
      "endpoints": [
        { "url": "/api/csp-report" }
      ]
    });
    response.headers.set("Report-To", reportToHeader);
  }

  return response;
}
