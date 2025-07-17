// Suppress sourcemap errors in browser console
window.addEventListener('error', function(e) {
  if (e.message && e.message.includes('source map')) {
    e.preventDefault();
  }
}, true);
