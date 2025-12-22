/**
 * Pre-render Blocker for AI Content
 * Blocks AI-generated content before it renders on the page
 */

console.log("[CloseAI] Pre-render blocker loaded");

// Fast metadata-based detection (no ML needed, instant)
// VERY CONSERVATIVE - only blocks content we're CERTAIN is AI
function quickMetadataCheck(element) {
  // Check for AI-related URLs, classes, or attributes
  const url = element.src || element.href || '';
  const className = element.className || '';
  const id = element.id || '';
  
  // VERY STRICT AI generator patterns in URLs - only obvious cases
  const aiUrlPatterns = [
    'midjourney.com', 'dall-e', 'dalle', 'stable-diffusion.com',
    'thispersondoesnotexist.com', 'thiswaifudoesnotexist.net',
    'thisxdoesnotexist.com', 'generated.photos',
    'ai-generated.com', 'ai_generated', 'ai-art.com',
    'deepfake', 'gan-generated.com'
  ];
  
  // Check URL - only block if URL explicitly contains AI generator domain
  const urlLower = url.toLowerCase();
  for (const pattern of aiUrlPatterns) {
    if (urlLower.includes(pattern)) {
      return { isAI: true, confidence: 0.90, reason: 'url_pattern' };
    }
  }
  
  // Only check class/id for very explicit AI generator names
  const classIdLower = (className + ' ' + id).toLowerCase();
  const explicitAIPatterns = ['midjourney', 'dall-e', 'dalle', 'thispersondoesnotexist'];
  for (const pattern of explicitAIPatterns) {
    if (classIdLower.includes(pattern)) {
      return { isAI: true, confidence: 0.85, reason: 'class_id_pattern' };
    }
  }
  
  // DO NOT block based on text - let ML detection handle that
  return { isAI: false, confidence: 0, reason: null };
}

// Immediately hide element (before detection completes)
function hideElementImmediately(element) {
  if (element.dataset.aiBlocked) return; // Already blocked
  
  element.dataset.aiBlocked = 'true';
  element.style.visibility = 'hidden';
  element.style.opacity = '0';
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  
  // Store original display/visibility for potential restore
  element.dataset.originalDisplay = element.style.display || '';
  element.dataset.originalVisibility = element.style.visibility || '';
}

// Restore element if false positive
function restoreElement(element) {
  if (!element.dataset.aiBlocked) return;
  
  element.dataset.aiBlocked = 'false';
  element.style.visibility = element.dataset.originalVisibility || '';
  element.style.opacity = '';
  element.style.position = '';
  element.style.left = '';
}

// Block images before they load
// ONLY blocks images with VERY HIGH confidence metadata matches
function blockImagePreRender(img) {
  // Quick metadata check first - must be VERY certain
  const metadataCheck = quickMetadataCheck(img);
  
  // Only block if confidence is very high (0.85+) and from explicit AI generator
  if (metadataCheck.isAI && metadataCheck.confidence >= 0.85) {
    hideElementImmediately(img);
    console.log("[CloseAI] Blocked image pre-render (high confidence):", metadataCheck.reason, img.src?.substring(0, 100));
    return true; // Blocked
  }
  
  // Don't pre-block other images - let ML detection handle them
  return false;
}

// Block text elements before they're visible
// DISABLED - We don't pre-block text, let ML detection handle it
function blockTextPreRender(element) {
  // Don't pre-block text - too many false positives
  // Let the existing ML detection system handle text
  return false;
}

// Intercept network requests for images
// ONLY blocks images from explicit AI generator domains
function interceptImageRequests() {
  if (!preRenderEnabled) return;
  
  // Override Image constructor to intercept
  const OriginalImage = window.Image;
  window.Image = function(...args) {
    const img = new OriginalImage(...args);
    
    // If src is set immediately, check it - ONLY block high confidence matches
    if (args[0] && preRenderEnabled) {
      const metadataCheck = quickMetadataCheck({ src: args[0] });
      // Only block if very high confidence (explicit AI generator domain)
      if (metadataCheck.isAI && metadataCheck.confidence >= 0.85) {
        // Block the image
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        img.dataset.aiBlocked = 'true';
        img.dataset.originalSrc = args[0];
        console.log("[CloseAI] Blocked image request (high confidence):", args[0].substring(0, 100));
      }
    }
    
    // Intercept src setter - ONLY for high confidence matches
    try {
      const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      if (srcDescriptor && srcDescriptor.set) {
        const originalSetter = srcDescriptor.set;
        Object.defineProperty(img, 'src', {
          set: function(value) {
            if (preRenderEnabled) {
              const metadataCheck = quickMetadataCheck({ src: value });
              // Only block if very high confidence
              if (metadataCheck.isAI && metadataCheck.confidence >= 0.85) {
                this.dataset.aiBlocked = 'true';
                this.dataset.originalSrc = value;
                originalSetter.call(this, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                console.log("[CloseAI] Blocked image src setter (high confidence):", value.substring(0, 100));
                return;
              }
            }
            originalSetter.call(this, value);
          },
          get: function() {
            return srcDescriptor.get ? srcDescriptor.get.call(this) : this.dataset.originalSrc;
          },
          configurable: true
        });
      }
    } catch (e) {
      // Some sites may have protected properties, fail gracefully
      console.warn("[CloseAI] Could not intercept image src setter:", e);
    }
    
    return img;
  };
  
  // Copy static properties
  try {
    Object.setPrototypeOf(window.Image, OriginalImage);
    Object.setPrototypeOf(window.Image.prototype, OriginalImage.prototype);
  } catch (e) {
    // Fail gracefully if prototype manipulation is blocked
  }
}

// Enhanced MutationObserver for pre-render blocking
// ONLY blocks images with very high confidence metadata matches
function setupPreRenderObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!preRenderEnabled) return; // Respect extension toggle
    
    for (const mutation of mutations) {
      // Handle added nodes
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        
        // ONLY block images - not text
        if (node.tagName === 'IMG') {
          blockImagePreRender(node);
        }
        
        // Check children for images only
        const images = node.querySelectorAll && node.querySelectorAll('img');
        if (images) {
          images.forEach(img => {
            if (!img.dataset.aiBlocked && !img.dataset.aiScanned) {
              blockImagePreRender(img);
            }
          });
        }
        
        // DO NOT check text elements - let ML detection handle those
      }
    }
  });
  
  // Start observing
  const target = document.body || document.documentElement;
  if (target) {
    observer.observe(target, {
      childList: true,
      subtree: true
    });
    console.log("[CloseAI] Pre-render observer active (images only, high confidence)");
  }
}

// Check if extension is enabled before blocking
let preRenderEnabled = true;

function checkExtensionState() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['enabled'], (result) => {
      preRenderEnabled = result.enabled !== false; // Default to true
    });
  }
}

// Listen for toggle messages
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'toggle') {
      preRenderEnabled = message.enabled;
    }
  });
}

// Initialize pre-render blocking
function initializePreRender() {
  checkExtensionState();
  
  if (document.body) {
    if (preRenderEnabled) {
      setupPreRenderObserver();
      interceptImageRequests();
    }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (preRenderEnabled) {
        setupPreRenderObserver();
        interceptImageRequests();
      }
    });
  }
}

// Run immediately (document_start)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePreRender);
} else {
  initializePreRender();
}

// Export functions for use in content.js
if (typeof window !== 'undefined') {
  window.closeaiPreRender = {
    quickMetadataCheck,
    hideElementImmediately,
    restoreElement,
    blockImagePreRender,
    blockTextPreRender
  };
}

