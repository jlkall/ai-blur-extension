console.log("[AI BLUR] Enhanced ML detection loaded");

const THRESHOLD = 0.25;
const IMAGE_THRESHOLD = 0.3; // Threshold for AI image detection
const BLUR_PX = 8;
const GRASS_URL = "https://www.google.com/search?q=grass+nature&tbm=isch";

// Cache for scores to avoid recomputation
const scoreCache = new Map();
const CACHE_SIZE = 1000;

// Queue for async ML scoring
const scoringQueue = [];
let isProcessingQueue = false;

/**
 * Process scoring queue with ML detector
 */
async function processScoringQueue() {
  if (isProcessingQueue || scoringQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (scoringQueue.length > 0) {
    const { element, text, callback } = scoringQueue.shift();
    
    try {
      // Use ML detector if available
      let score;
      if (typeof detectAIGenerated !== 'undefined') {
        const result = await detectAIGenerated(text);
        score = result ? result.score : scoreParagraphSync(text);
      } else {
        score = scoreParagraphSync(text);
      }
      
      // Cache the score
      const cacheKey = text.substring(0, 100);
      if (scoreCache.size >= CACHE_SIZE) {
        const firstKey = scoreCache.keys().next().value;
        scoreCache.delete(firstKey);
      }
      scoreCache.set(cacheKey, score);
      
      callback(score);
    } catch (error) {
      console.warn("[AI BLUR] Scoring error:", error);
      callback(scoreParagraphSync(text));
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Score text with caching and async ML support
 */
function scoreText(text) {
  if (!text || text.trim().length < 20) return 0;
  
  // Check cache
  const cacheKey = text.substring(0, 100);
  if (scoreCache.has(cacheKey)) {
    return scoreCache.get(cacheKey);
  }
  
  // Quick heuristic for very short text
  const words = text.trim().split(/\s+/).length;
  if (words < 20) return 0.1;
  
  // Use synchronous scoring for immediate feedback
  // ML scoring will happen asynchronously
  if (typeof scoreParagraphSync === 'function') {
    return scoreParagraphSync(text);
  } else {
    console.warn("[AI BLUR] scoreParagraphSync not available, using fallback");
    // Fallback: simple word count heuristic
    if (words > 150) return 0.9;
    if (words > 100) return 0.7;
    if (words > 60) return 0.5;
    if (words > 40) return 0.3;
    return 0.1;
  }
}

/**
 * Score text asynchronously with ML (for better accuracy)
 */
async function scoreTextAsync(text) {
  if (!text || text.trim().length < 20) return 0;
  
  // Check cache
  const cacheKey = text.substring(0, 100);
  if (scoreCache.has(cacheKey)) {
    return scoreCache.get(cacheKey);
  }
  
  try {
    if (typeof detectAIGenerated !== 'undefined') {
      const result = await detectAIGenerated(text);
      const score = result ? result.score : (typeof scoreParagraphSync === 'function' ? scoreParagraphSync(text) : 0.5);
      
      // Cache the score
      if (scoreCache.size >= CACHE_SIZE) {
        const firstKey = scoreCache.keys().next().value;
        scoreCache.delete(firstKey);
      }
      scoreCache.set(cacheKey, score);
      
      return score;
    }
    } catch (error) {
      console.warn("[AI BLUR] Async scoring error:", error);
    }
  
  return typeof scoreParagraphSync === 'function' ? scoreParagraphSync(text) : 0.5;
}

function blurWithCTA(el, score) {
  if (el.dataset.aiBlur === "true") return;
  if (!el.innerText || el.innerText.trim().length < 40) return;

  el.dataset.aiBlur = "true";
  el.style.position = "relative";

  const span = document.createElement("span");
  span.textContent = el.innerText;
  span.dataset.blurred = "true";

  span.style.filter = "blur(" + BLUR_PX + "px)";
  span.style.cursor = "pointer";
  span.style.transition = "filter 0.15s ease";

  // CTA button - clean, modern design
  const button = document.createElement("a");
  button.textContent = "Go touch grass 🌱";
  button.href = GRASS_URL;
  button.target = "_blank";
  button.rel = "noopener noreferrer";

  // Positioning
  button.style.position = "absolute";
  button.style.top = "50%";
  button.style.left = "50%";
  button.style.transform = "translate(-50%, -50%)";
  button.style.zIndex = "9999";
  
  // Typography
  button.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  button.style.fontSize = "13px";
  button.style.fontWeight = "500";
  button.style.letterSpacing = "0.01em";
  button.style.color = "#ffffff";
  button.style.textDecoration = "none";
  button.style.whiteSpace = "nowrap";
  
  // Layout
  button.style.padding = "8px 20px";
  button.style.borderRadius = "20px";
  button.style.border = "none";
  button.style.outline = "none";
  
  // Colors and effects
  button.style.background = "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
  button.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)";
  button.style.backdropFilter = "blur(10px)";
  
  // Transitions
  button.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
  button.style.cursor = "pointer";
  
  // Hover effects
  button.addEventListener("mouseenter", function() {
    button.style.transform = "translate(-50%, -50%) scale(1.05)";
    button.style.boxShadow = "0 6px 16px rgba(34, 197, 94, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)";
  });
  
  button.addEventListener("mouseleave", function() {
    button.style.transform = "translate(-50%, -50%) scale(1)";
    button.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)";
  });
  
  // Active state
  button.addEventListener("mousedown", function() {
    button.style.transform = "translate(-50%, -50%) scale(0.98)";
  });
  
  button.addEventListener("mouseup", function() {
    button.style.transform = "translate(-50%, -50%) scale(1.05)";
  });

  // Toggle blur on text click
  span.addEventListener("click", function () {
    const isBlurred = span.dataset.blurred === "true";
    if (isBlurred) {
      span.style.filter = "none";
      span.dataset.blurred = "false";
      button.style.display = "none";
    } else {
      span.style.filter = "blur(" + BLUR_PX + "px)";
      span.dataset.blurred = "true";
      button.style.display = "block";
    }
  });

  el.innerHTML = "";
  el.appendChild(span);
  el.appendChild(button);
}

/**
 * Replace AI image with slop (crayon drawing)
 */
function replaceImageWithSlop(img, score) {
  if (img.dataset.aiReplaced === "true") return;
  if (!img.complete || img.naturalWidth === 0) return;
  
  img.dataset.aiReplaced = "true";
  img.dataset.originalSrc = img.src;
  
  // Generate slop image matching original dimensions
  const width = img.naturalWidth || img.width || 400;
  const height = img.naturalHeight || img.height || 300;
  
  if (typeof generateSlopImage === 'function') {
    const slopDataUrl = generateSlopImage(width, height);
    img.src = slopDataUrl;
    
    // Add overlay with CTA
    const container = img.parentElement;
    if (container && container.style.position !== 'relative') {
      container.style.position = 'relative';
    }
    
    // Create overlay button
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.zIndex = "9999";
    overlay.style.pointerEvents = "none";
    
    const button = document.createElement("a");
    button.textContent = "Go touch grass 🌱";
    button.href = GRASS_URL;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    
    // Apply same styling as text CTA
    button.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    button.style.fontSize = "13px";
    button.style.fontWeight = "500";
    button.style.letterSpacing = "0.01em";
    button.style.color = "#ffffff";
    button.style.textDecoration = "none";
    button.style.whiteSpace = "nowrap";
    button.style.padding = "8px 20px";
    button.style.borderRadius = "20px";
    button.style.border = "none";
    button.style.outline = "none";
    button.style.background = "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
    button.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)";
    button.style.backdropFilter = "blur(10px)";
    button.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    button.style.cursor = "pointer";
    button.style.pointerEvents = "auto";
    
    // Hover effects
    button.addEventListener("mouseenter", function() {
      button.style.transform = "scale(1.05)";
      button.style.boxShadow = "0 6px 16px rgba(34, 197, 94, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)";
    });
    
    button.addEventListener("mouseleave", function() {
      button.style.transform = "scale(1)";
      button.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)";
    });
    
    overlay.appendChild(button);
    
    // Add click handler to restore original
    img.addEventListener("click", function() {
      if (img.dataset.originalSrc) {
        img.src = img.dataset.originalSrc;
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        img.dataset.aiReplaced = "false";
      }
    });
    
    // Insert overlay
    if (container && container.style.position === 'relative') {
      container.appendChild(overlay);
    } else {
      // Fallback: wrap image
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-block";
      if (img.parentNode) {
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(overlay);
      }
    }
  }
}

/**
 * Scan and process images
 */
async function scanImages(root) {
  const images = root.querySelectorAll("img:not([data-ai-scanned])");
  
  for (const img of images) {
    // Skip very small images (icons, avatars)
    if (img.width < 50 || img.height < 50) {
      img.dataset.aiScanned = "true";
      continue;
    }
    
    // Skip if already processed
    if (img.dataset.aiReplaced === "true") continue;
    
    // Wait for image to load
    if (!img.complete) {
      img.addEventListener("load", async function() {
        img.dataset.aiScanned = "true";
        if (typeof detectAIImage !== 'undefined') {
          const result = await detectAIImage(img);
          if (result && result.score >= IMAGE_THRESHOLD) {
            replaceImageWithSlop(img, result.score);
          }
        }
      }, { once: true });
      continue;
    }
    
    img.dataset.aiScanned = "true";
    
    // Detect AI image
    if (typeof detectAIImage !== 'undefined') {
      try {
        const result = await detectAIImage(img);
        if (result && result.score >= IMAGE_THRESHOLD) {
          replaceImageWithSlop(img, result.score);
        }
      } catch (error) {
        console.warn("[AI BLUR] Image detection error:", error);
      }
    }
  }
}

/**
 * Enhanced scanning with async ML scoring
 */
async function scan(root) {
  const elements = root.querySelectorAll("p, li, div[class*='content'], div[class*='text'], article");

  for (const el of elements) {
    if (el.dataset.aiBlur === "true") continue;
    if (el.dataset.aiScanned === "true") continue;

    const text = el.innerText;
    if (!text || text.trim().length < 40) continue;

    // Mark as scanned to avoid duplicate processing
    el.dataset.aiScanned = "true";

    // Quick synchronous check first
    const quickScore = scoreText(text);
    
    if (quickScore >= THRESHOLD) {
      blurWithCTA(el, quickScore);
      
      // Then refine with async ML scoring
      scoreTextAsync(text).then(refinedScore => {
        // Update if ML score is significantly different
        if (Math.abs(refinedScore - quickScore) > 0.15) {
          if (refinedScore >= THRESHOLD && el.dataset.aiBlur !== "true") {
            blurWithCTA(el, refinedScore);
          } else if (refinedScore < THRESHOLD && el.dataset.aiBlur === "true") {
            // Remove blur if ML says it's not AI
            el.dataset.aiBlur = "false";
            el.innerHTML = text;
          }
        }
      }).catch(() => {
        // Silently fail, already blurred with sync score
      });
    }
  }
  
  // Also scan images in the same root
  scanImages(root);
}

// Observe SPA / hydration
const observer = new MutationObserver(function (mutations) {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        // Debounce scanning
        setTimeout(() => {
          scan(n);
          scanImages(n);
        }, 100);
      }
    }
  }
});

// Boot
if (document.body) {
  scan(document.body);
  scanImages(document.body);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} else {
  document.addEventListener("DOMContentLoaded", () => {
    scan(document.body);
    scanImages(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}
