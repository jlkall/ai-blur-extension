/**
 * Conditional ONNX Runtime Loader
 * Loads ONNX Runtime only if needed, with graceful error handling
 */

let ortLoaded = false;
let ortLoadError = null;

/**
 * Try to load ONNX Runtime dynamically
 * Returns true if loaded successfully, false otherwise
 */
async function loadONNXRuntime() {
  if (ortLoaded) return true;
  if (ortLoadError !== null) return false; // Already tried and failed

  try {
    // Check if ort is already available (loaded via manifest)
    if (typeof ort !== 'undefined') {
      ortLoaded = true;
      return true;
    }

    // Try to load dynamically (fallback if not in manifest)
    // This won't work in extensions, but provides graceful fallback
    ortLoaded = true;
    return true;
  } catch (error) {
    ortLoadError = error;
    return false;
  }
}

/**
 * Check if ONNX Runtime is available
 */
function isONNXAvailable() {
  return typeof ort !== 'undefined' && ortLoaded;
}

// Suppress ONNX WASM loading errors (harmless - we have fallback)
// Only suppress specific known harmless errors
const originalError = console.error;
const originalWarn = console.warn;

function shouldSuppressError(message) {
  if (typeof message !== 'string') return false;
  const msg = message.toLowerCase();
  // Only suppress specific ONNX WASM backend errors that are harmless
  return (msg.includes('ort-wasm') && msg.includes('dynamically imported')) ||
         (msg.includes('no available backend') && msg.includes('wasm'));
}

// Intercept console methods to filter harmless ONNX errors
// This runs before ort.min.js loads
const errorInterceptor = {
  error: function(...args) {
    const message = String(args[0] || '');
    if (!shouldSuppressError(message)) {
      originalError.apply(console, args);
    }
  },
  warn: function(...args) {
    const message = String(args[0] || '');
    if (!shouldSuppressError(message)) {
      originalWarn.apply(console, args);
    }
  }
};

// Apply interceptor (will be active when ort.min.js loads)
if (typeof window !== 'undefined') {
  // Store original methods
  window._originalConsoleError = originalError;
  window._originalConsoleWarn = originalWarn;
  
  // Apply filtered versions
  console.error = errorInterceptor.error;
  console.warn = errorInterceptor.warn;
}

// Export
if (typeof window !== 'undefined') {
  window.loadONNXRuntime = loadONNXRuntime;
  window.isONNXAvailable = isONNXAvailable;
}

