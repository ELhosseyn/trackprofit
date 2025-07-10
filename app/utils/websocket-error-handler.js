/**
 * WebSocket Error Handler
 * 
 * This module provides error handling for WebSocket connections,
 * particularly for Shopify's Argus service which may not always be available.
 */

/**
 * Initialize WebSocket error handler
 * Handles errors related to Shopify's WebSocket connections
 * and prevents them from cluttering the console.
 */
export function initializeWebSocketErrorHandler() {
  // Only run in the browser
  if (typeof window === 'undefined') return;

  // Store original console.error
  const originalConsoleError = console.error;

  // Override console.error to filter WebSocket errors
  console.error = function(...args) {
    // Check if this is a WebSocket error for Shopify's Argus service
    const errorString = args.join(' ');
    if (
      errorString.includes('wss://argus.shopifycloud.com') ||
      (args[0] && args[0].message && args[0].message.includes('argus.shopifycloud.com'))
    ) {
      // Suppress Shopify Argus WebSocket errors in production
      if (process.env.NODE_ENV === 'production') {
        return;
      }
      
      // In development, log a simplified version
      console.warn('Note: Shopify Argus WebSocket connection failed. This is expected in development.');
      return;
    }
    
    // Pass through all other errors to the original console.error
    originalConsoleError.apply(console, args);
  };
  
  // Suppress WebSocket connection errors
  window.addEventListener('error', function(event) {
    if (
      event.message && 
      (
        event.message.includes('argus.shopifycloud.com') ||
        event.message.includes('WebSocket connection')
      )
    ) {
      event.preventDefault();
      return true;
    }
    return false;
  }, true);
}
