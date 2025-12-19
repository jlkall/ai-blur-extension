console.log("[AI BLUR] Enhanced ML detection loaded");

const THRESHOLD = 0.25;
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
  const syncScore = scoreParagraphSync(text);
  
  return syncScore;
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
      const score = result ? result.score : scoreParagraphSync(text);
      
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
  
  return scoreParagraphSync(text);
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

  // CTA button
  const button = document.createElement("a");
  button.textContent = "Go touch grass 🌱";
  button.href = GRASS_URL;
  button.target = "_blank";
  button.rel = "noopener noreferrer";

  button.style.position = "absolute";
  button.style.top = "50%";
  button.style.left = "50%";
  button.style.transform = "translate(-50%, -50%)";
  button.style.padding = "10px 16px";
  button.style.fontSize = "14px";
  button.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont";
  button.style.borderRadius = "999px";
  button.style.background = "#22c55e";
  button.style.color = "white";
  button.style.fontWeight = "600";
  button.style.textDecoration = "none";
  button.style.zIndex = "9999";
  button.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";

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
}

// Observe SPA / hydration
const observer = new MutationObserver(function (mutations) {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        // Debounce scanning
        setTimeout(() => scan(n), 100);
      }
    }
  }
});

// Boot
if (document.body) {
  scan(document.body);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} else {
  document.addEventListener("DOMContentLoaded", () => {
    scan(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}
