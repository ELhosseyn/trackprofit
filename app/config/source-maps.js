/**
 * Source Map Configuration
 * 
 * This module exports configuration for source maps that can be used
 * in the Vite config to control source map generation based on environment.
 */

/**
 * Determines if source maps should be generated
 * - In development: Generate full source maps for debugging
 * - In production: No source maps for security and performance
 * 
 * @returns {boolean|'inline'|'hidden'} Source map configuration
 */
export function getSourceMapConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'development') {
    // Full source maps in development for debugging
    return true;
  } else if (env === 'production') {
    // No source maps in production for security and performance
    return false;
  } else if (env === 'test') {
    // Hidden source maps in test (still generated but not referenced)
    return 'hidden';
  }
  
  // Default to no source maps
  return false;
}

/**
 * Gets source map configuration for Vite
 * @returns {object} Vite source map configuration object
 */
export function getViteSourceMapConfig() {
  return {
    sourcemap: getSourceMapConfig()
  };
}
