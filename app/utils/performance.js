// Performance utility functions for tracking application performance

// Performance marks to track important points in the application lifecycle
export const PERF_MARKS = {
  APP_INIT: 'app-init',
  APP_LOAD: 'app-load',
  APP_READY: 'app-ready',
  RENDERING: 'rendering',
  RENDERING_COMPLETE: 'rendering-complete',
  DATA_FETCH_START: 'data-fetch-start',
  DATA_FETCH_END: 'data-fetch-end'
};

// Check if performance API is available
const hasPerformanceAPI = typeof performance !== 'undefined' && 
  typeof performance.mark === 'function' && 
  typeof performance.measure === 'function';

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  if (!hasPerformanceAPI) return;
  
  // Set initial mark if not already set
  markPerformance(PERF_MARKS.APP_INIT);
  
  // Clear any existing marks from previous page loads
  try {
    performance.clearMarks();
    performance.clearMeasures();
  } catch (e) {
    console.error('Failed to clear performance marks:', e);
  }
  
  // Set initial mark again after clearing
  markPerformance(PERF_MARKS.APP_INIT);
  
  // Log navigation timing metrics
  if (performance.getEntriesByType && typeof performance.getEntriesByType === 'function') {
    try {
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {

      }
    } catch (e) {
      console.error('Failed to get navigation timing:', e);
    }
  }
}

/**
 * Create a performance mark
 * @param {string} name - Name of the mark
 */
export function markPerformance(name) {
  if (!hasPerformanceAPI) return;
  
  try {
    performance.mark(name);
    
    if (process.env.NODE_ENV !== 'production') {

    }
  } catch (e) {
    console.error(`Failed to set performance mark '${name}':`, e);
  }
}

/**
 * Measure time between two marks
 * @param {string} name - Name of the measure
 * @param {string} startMark - Starting mark
 * @param {string} endMark - Ending mark
 * @returns {number|null} Duration in ms or null if measurement failed
 */
export function measurePerformance(name, startMark, endMark) {
  if (!hasPerformanceAPI) return null;
  
  try {
    performance.measure(name, startMark, endMark);
    const measures = performance.getEntriesByName(name, 'measure');
    
    if (measures.length > 0) {
      const duration = measures[0].duration;
      
      if (process.env.NODE_ENV !== 'production') {

      }
      
      return duration;
    }
  } catch (e) {
    console.error(`Failed to measure performance '${name}':`, e);
  }
  
  return null;
}

/**
 * Report performance metrics to server or monitoring service
 * @param {Object} metrics - Performance metrics to report
 */
export function reportPerformanceMetrics(metrics) {
  // Implementation would depend on your monitoring service
  // This could send data to Google Analytics, New Relic, etc.
  if (process.env.NODE_ENV !== 'production') {

  }
  
  // Example implementation for sending to a monitoring endpoint
  // if (typeof fetch === 'function') {
  //   fetch('/api/performance-metrics', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(metrics)
  //   }).catch(err => console.error('Failed to report metrics:', err));
  // }
}

/**
 * Get all performance metrics as an object
 * @returns {Object} Object containing all performance metrics
 */
export function getAllPerformanceMetrics() {
  if (!hasPerformanceAPI) return {};
  
  try {
    const metrics = {};
    const measures = performance.getEntriesByType('measure');
    
    measures.forEach(measure => {
      metrics[measure.name] = measure.duration;
    });
    
    return metrics;
  } catch (e) {
    console.error('Failed to get performance metrics:', e);
    return {};
  }
}
