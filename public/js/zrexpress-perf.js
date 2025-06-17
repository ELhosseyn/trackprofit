/**
 * Performance monitor for ZRExpress component
 * 
 * This file gets injected into the ZRExpress page to track and report performance metrics.
 * It will help developers understand how the optimizations are impacting actual user experience.
 */

(function() {
  // Create a performance observer to monitor loading metrics
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      // Capture main thread blocking
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`⚠️ Long task detected: ${Math.round(entry.duration)}ms on ${entry.name}`);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      
      // Capture resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
            const time = Math.round(entry.duration);
            if (time > 500) {
              console.log(`⚠️ Slow API call: ${entry.name} took ${time}ms`);
            }
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.error('Performance observer error:', e);
    }
  }
  
  // Track component render time
  const COMPONENT_START_TIME = performance.now();
  
  // Attach to window load event
  window.addEventListener('load', () => {
    // Calculate and report metrics
    const loadTime = performance.now() - COMPONENT_START_TIME;
    
    // Log performance metrics
    console.log(`
    📊 ZRExpress Performance Metrics:
    --------------------------------
    Load time: ${Math.round(loadTime)}ms
    FCP: ${getFCP()}ms
    LCP: ${getLCP()}ms
    CLS: ${getCLS()}
    --------------------------------
    `);
    
    // Send metrics to analytics if below target
    if (loadTime > 8) {
      console.warn(`⚠️ Load time (${Math.round(loadTime)}ms) exceeds target (8ms)`);
    } else {
      console.log(`✅ Load time (${Math.round(loadTime)}ms) meets target (8ms)`);
    }
  });
  
  // Helper functions to get Web Vitals
  function getFCP() {
    const navEntry = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? Math.round(fcpEntry.startTime) : 'Not available';
  }
  
  function getLCP() {
    try {
      // Using PerformanceObserver if available, otherwise fallback
      const entries = performance.getEntriesByType('element');
      if (entries.length) {
        const lcpEntry = entries.reduce((max, entry) => entry.startTime > max.startTime ? entry : max, entries[0]);
        return Math.round(lcpEntry.startTime);
      }
      return 'Not available';
    } catch (e) {
      return 'Not available';
    }
  }
  
  function getCLS() {
    try {
      // Simplified CLS calculation
      const layoutShifts = performance.getEntriesByType('layout-shift');
      if (layoutShifts.length) {
        const cls = layoutShifts.reduce((sum, shift) => sum + shift.value, 0);
        return cls.toFixed(3);
      }
      return 'Not available';
    } catch (e) {
      return 'Not available';
    }
  }
})();
