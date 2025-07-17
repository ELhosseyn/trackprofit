
(function() {
  // Suppress specific warnings in browser console
  let suppressedWarnings = [
    'Warning: ...', // Add warning messages to suppress
  ];

  if (!window.__suppressWarnPatched) {
    const originalWarn = window.console.warn;
    window.console.warn = function(msg, ...args) {
      if (suppressedWarnings.some(w => msg.includes(w))) return;
      originalWarn.call(window.console, msg, ...args);
    };
    window.__suppressWarnPatched = true;
  }
})();
