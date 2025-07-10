/**
 * This script suppresses common browser warnings related to Feature Policy, 
 * Permissions Policy, and other modern browser features.
 * 
 * It's useful for keeping the console clean when using third-party code like Shopify's
 * that may trigger warnings about experimental or non-standard features.
 */
(function() {
  // Store the original console.warn
  const originalWarn = console.warn;
  
  // List of warning patterns to suppress
  const suppressPatterns = [
    "Feature Policy: Skipping unsupported feature name",
    "This page uses the non standard property",
    "Ignoring unsupported entryTypes",
    "Layout was forced before the page was fully loaded"
  ];
  
  // Override console.warn to filter out specific warnings
  console.warn = function(...args) {
    // Check if the warning message contains any of our suppress patterns
    if (args.length > 0 && typeof args[0] === 'string') {
      for (const pattern of suppressPatterns) {
        if (args[0].includes(pattern)) {
          // Skip this warning and don't output to console
          return;
        }
      }
    }
    
    // For all other warnings, use the original console.warn
    return originalWarn.apply(console, args);
  };
})();
