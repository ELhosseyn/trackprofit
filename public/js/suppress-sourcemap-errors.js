/**
 * This script suppresses source map loading errors in the console
 * to keep the developer experience clean while using Shopify's CDN resources.
 */
(function() {
  // Store the original error handler
  const originalOnError = window.onerror;
  
  // Override the global error handler to filter out source map errors
  window.onerror = function(message, source, lineno, colno, error) {
    // Check if it's a source map error from Shopify CDN
    if (source && 
        (source.includes('cdn.shopify.com') || source.includes('web-sourcemaps.shopify.io')) && 
        message.includes('NetworkError when attempting to fetch resource')) {
      // Suppress these specific errors
      console.debug('Suppressed source map error for:', source);
      return true; // Prevents the error from being shown in console
    }
    
    // For all other errors, use the original handler
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    
    return false; // Let default error handling occur
  };
})();
