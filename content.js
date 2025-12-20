console.log("[CloseAI] Enhanced ML detection loaded");

const THRESHOLD = 0.25;
const IMAGE_THRESHOLD = 0.40; // Threshold for AI image detection (with metadata, can be slightly lower)
const BLUR_PX = 8;

// Extension enabled state (default to true)
let extensionEnabled = true;
let outlineMode = false;
let showCertainty = false;

// Load enabled state from storage (with defensive check)
function loadEnabledState() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['enabled', 'outlineMode', 'showCertainty'], (result) => {
      extensionEnabled = result.enabled !== false; // Default to true
      outlineMode = result.outlineMode === true;
      showCertainty = result.showCertainty === true;
      if (!extensionEnabled) {
        console.log("[CloseAI] Extension is disabled");
      }
    });
  }
}

// Load state on initialization
loadEnabledState();

// Listen for toggle messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle') {
      extensionEnabled = message.enabled;
      console.log("[CloseAI] Extension toggled:", extensionEnabled ? "enabled" : "disabled");
      
      if (!extensionEnabled) {
        // Remove all blur effects when disabled
        removeAllBlurs();
        removeAllOutlines();
      } else {
        // Re-scan when re-enabled
        scan(document.body);
        scanImages(document.body);
      }
      sendResponse({ success: true });
    } else if (message.action === 'toggleOutlineMode') {
      outlineMode = message.enabled;
      console.log("[CloseAI] Outline mode toggled:", outlineMode ? "enabled" : "disabled");
      
      // Remove all effects and re-scan with new mode
      removeAllBlurs();
      removeAllOutlines();
      if (extensionEnabled) {
        scan(document.body);
        scanImages(document.body);
      }
      sendResponse({ success: true });
    } else if (message.action === 'toggleCertainty') {
      showCertainty = message.enabled;
      console.log("[CloseAI] Show certainty toggled:", showCertainty ? "enabled" : "disabled");
      
      // Update all existing flagged assets
      updateAllCertaintyBlobs();
      sendResponse({ success: true });
    }
    return true;
  });
}

/**
 * Update all certainty blobs on the page
 */
function updateAllCertaintyBlobs() {
  // Update text elements
  const textElements = document.querySelectorAll('[data-ai-blur="true"], [data-ai-outline="true"]');
  textElements.forEach(el => {
    const score = parseFloat(el.dataset.aiScore) || 0;
    const confidence = el.dataset.aiConfidence ? parseFloat(el.dataset.aiConfidence) : null;
    
    // Remove existing certainty blob
    const existingBlob = el.querySelector('.closeai-certainty-blob');
    if (existingBlob) {
      existingBlob.remove();
    }
    
    // Remove existing confidence badge if showing certainty
    if (showCertainty) {
      const badges = el.querySelectorAll('div[style*="top: 8px; right: 8px;"]');
      badges.forEach(badge => {
        if (!badge.classList.contains('closeai-certainty-blob')) {
          badge.remove();
        }
      });
    }
    
    // Add certainty blob if enabled
    if (showCertainty) {
      addCertaintyBlob(el, score, confidence);
    }
  });
  
  // Update image elements
  const imageElements = document.querySelectorAll('img[data-ai-blurred="true"], img[data-ai-outline="true"]');
  imageElements.forEach(img => {
    const container = img.parentElement;
    if (!container) return;
    
    // Get score from either container or image itself
    const score = parseFloat(container.dataset.aiScore || img.dataset.aiScore) || 0;
    const confidence = container.dataset.aiConfidence ? parseFloat(container.dataset.aiConfidence) : 
                      (img.dataset.aiConfidence ? parseFloat(img.dataset.aiConfidence) : null);
    
    // Remove existing certainty blob
    const existingBlob = container.querySelector('.closeai-certainty-blob');
    if (existingBlob) {
      existingBlob.remove();
    }
    
    // Remove existing confidence badge if showing certainty
    if (showCertainty) {
      const badges = container.querySelectorAll('div[style*="top: 8px; right: 8px;"]');
      badges.forEach(badge => {
        if (!badge.classList.contains('closeai-certainty-blob')) {
          badge.remove();
        }
      });
    }
    
    // Add certainty blob if enabled
    if (showCertainty) {
      addCertaintyBlob(container, score, confidence);
    }
  });
}

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
      console.warn("[CloseAI] Scoring error:", error);
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
    console.warn("[CloseAI] scoreParagraphSync not available, using fallback");
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
  if (!text || text.trim().length < 20) return { score: 0, confidence: null };
  
  // Check cache
  const cacheKey = text.substring(0, 100);
  if (scoreCache.has(cacheKey)) {
    const cached = scoreCache.get(cacheKey);
    // Handle both old format (number) and new format (object)
    if (typeof cached === 'object' && cached !== null && cached.score !== undefined) {
      return cached;
    }
    // Old format - just a number
    return { score: typeof cached === 'number' ? cached : 0.5, confidence: null };
  }
  
  try {
    if (typeof detectAIGenerated !== 'undefined') {
      const result = await detectAIGenerated(text);
      if (result && typeof result === 'object' && result.score !== undefined) {
        // Return object with score and confidence
        const score = result.score;
        const confidence = result.confidence || null;
        
        // Cache the result
        if (scoreCache.size >= CACHE_SIZE) {
          const firstKey = scoreCache.keys().next().value;
          scoreCache.delete(firstKey);
        }
        scoreCache.set(cacheKey, { score, confidence });
        
        return { score, confidence };
      } else {
        // Fallback for old API
        const score = result || (typeof scoreParagraphSync === 'function' ? scoreParagraphSync(text) : 0.5);
        const cachedResult = { score, confidence: null };
        scoreCache.set(cacheKey, cachedResult);
        return cachedResult;
      }
    }
    } catch (error) {
      console.warn("[CloseAI] Async scoring error:", error);
    }
  
  const fallbackScore = typeof scoreParagraphSync === 'function' ? scoreParagraphSync(text) : 0.5;
  return { score: fallbackScore, confidence: null };
}

/**
 * Calculate AI certainty from score and confidence
 * Certainty represents how certain we are this is AI-generated
 * Uses the detection score directly, or combines with confidence if available
 */
function calculateCertainty(score, confidence) {
  // Use the detection score as the primary certainty metric
  // If we have confidence, it can help refine, but score is the main indicator
  // Score already represents AI likelihood (0-1 scale)
  if (confidence !== null && confidence !== undefined) {
    // Weighted: 70% score (main indicator), 30% confidence (refinement)
    return Math.min(1, (score * 0.7 + confidence * 0.3));
  }
  // If no confidence, score IS the certainty
  return score;
}

/**
 * Add a small certainty blob to the top right corner of an element
 */
function addCertaintyBlob(element, score, confidence) {
  // Remove existing certainty blob if any
  const existingBlob = element.querySelector('.closeai-certainty-blob');
  if (existingBlob) {
    existingBlob.remove();
  }
  
  const certainty = calculateCertainty(score, confidence);
  const certaintyPercent = Math.round(certainty * 100);
  
  const blob = document.createElement("div");
  blob.className = "closeai-certainty-blob";
  blob.textContent = certaintyPercent + "%";
  
  // Small blob styling - top right corner
  blob.style.position = "absolute";
  blob.style.top = "4px";
  blob.style.right = "4px";
  blob.style.zIndex = "100";
  blob.style.pointerEvents = "none";
  
  // Small, minimal blob design
  blob.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  blob.style.fontSize = "11px";
  blob.style.fontWeight = "700";
  blob.style.color = "#ffffff";
  // Color coding: Red = high AI certainty, Orange = medium, Yellow = low
  blob.style.background = certainty >= 0.7 ? "rgba(244, 67, 54, 0.95)" : certainty >= 0.5 ? "rgba(255, 152, 0, 0.95)" : "rgba(255, 193, 7, 0.95)";
  blob.style.padding = "4px 7px";
  blob.style.borderRadius = "12px";
  blob.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
  blob.style.lineHeight = "1.2";
  blob.style.minWidth = "32px";
  blob.style.textAlign = "center";
  blob.style.border = "1px solid rgba(255, 255, 255, 0.2)";
  
  element.appendChild(blob);
}

function blurWithCTA(el, score, confidence = null) {
  if (el.dataset.aiBlur === "true" || el.dataset.aiOutline === "true") return;
  if (!el.innerText || el.innerText.trim().length < 40) return;

  // Check if outline mode is enabled
  if (outlineMode) {
    outlineWithCTA(el, score, confidence);
    return;
  }

  el.dataset.aiBlur = "true";
  el.style.position = "relative";
  el.style.isolation = "isolate"; // Create new stacking context
  el.style.zIndex = "1"; // Low z-index for the container

  const span = document.createElement("span");
  span.textContent = el.innerText;
  span.dataset.blurred = "true";

  span.style.filter = "blur(" + BLUR_PX + "px)";
  span.style.cursor = "pointer";
  span.style.transition = "filter 0.15s ease";
  span.style.position = "relative";
  span.style.zIndex = "1";

  // Only show badges if certainty toggle is ON
  if (showCertainty) {
    addCertaintyBlob(el, score, confidence);
  }

  // Toggle blur on text click
  span.addEventListener("click", function () {
    const isBlurred = span.dataset.blurred === "true";
    if (isBlurred) {
      span.style.filter = "none";
      span.dataset.blurred = "false";
    } else {
      span.style.filter = "blur(" + BLUR_PX + "px)";
      span.dataset.blurred = "true";
    }
  });

  el.innerHTML = "";
  el.appendChild(span);
  
  // Add feedback buttons if game mode is enabled
  if (typeof addFeedbackButtons !== 'undefined') {
    const checkGameMode = typeof isGameModeEnabled !== 'undefined' ? isGameModeEnabled : 
                         (typeof gameModeEnabled !== 'undefined' ? gameModeEnabled : () => false);
    if (checkGameMode()) {
      setTimeout(() => {
        addFeedbackButtons(el, score, confidence, false);
      }, 100);
    }
  }
}

/**
 * Outline AI content with green box instead of blurring
 */
function outlineWithCTA(el, score, confidence = null) {
  if (el.dataset.aiOutline === "true") return;
  if (!el.innerText || el.innerText.trim().length < 40) return;

  el.dataset.aiOutline = "true";
  
  // Store score and confidence for later updates
  el.dataset.aiScore = score;
  if (confidence !== null && confidence !== undefined) {
    el.dataset.aiConfidence = confidence;
  }
  el.style.position = "relative";
  el.style.isolation = "isolate";
  el.style.zIndex = "1";

  // Add thin green outline box
  el.style.border = "1px solid rgba(76, 175, 80, 0.8)";
  el.style.borderRadius = "4px";
  el.style.padding = "8px";
  el.style.backgroundColor = "transparent";
  el.style.boxShadow = "none";

  // Only show badges if certainty toggle is ON
  if (showCertainty) {
    addCertaintyBlob(el, score, confidence);
  }
  
  // Store score and confidence for later updates
  el.dataset.aiScore = score;
  if (confidence !== null && confidence !== undefined) {
    el.dataset.aiConfidence = confidence;
  }

  // Toggle outline on click
  el.style.cursor = "pointer";
  el.addEventListener("click", function () {
    if (el.style.border === "none" || el.style.border === "") {
      el.style.border = "1px solid rgba(76, 175, 80, 0.8)";
      el.style.backgroundColor = "transparent";
    } else {
      el.style.border = "none";
      el.style.backgroundColor = "transparent";
    }
  });

  // Add feedback buttons if game mode is enabled
  if (typeof addFeedbackButtons !== 'undefined') {
    const checkGameMode = typeof isGameModeEnabled !== 'undefined' ? isGameModeEnabled : 
                         (typeof gameModeEnabled !== 'undefined' ? gameModeEnabled : () => false);
    if (checkGameMode()) {
      setTimeout(() => {
        addFeedbackButtons(el, score, confidence, false);
      }, 100);
    }
  }
}

/**
 * Blur AI image and show confidence rating
 */
function blurImageWithConfidence(img, score, confidence = null) {
  if (img.dataset.aiBlurred === "true" || img.dataset.aiOutline === "true") return;
  if (!img.complete || img.naturalWidth === 0) return;
  
  // Check if outline mode is enabled
  if (outlineMode) {
    outlineImageWithConfidence(img, score, confidence);
    return;
  }
  
  img.dataset.aiBlurred = "true";
  
  // Store score and confidence on image for later updates
  img.dataset.aiScore = score;
  if (confidence !== null && confidence !== undefined) {
    img.dataset.aiConfidence = confidence;
  }
  
  // Apply blur to image
  img.style.filter = "blur(" + BLUR_PX + "px)";
  img.style.transition = "filter 0.15s ease";
  img.style.cursor = "pointer";
  
  // Ensure we have a container for badges
  let container = img.parentElement;
  if (!container || container.style.position !== 'relative') {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.isolation = "isolate";
    wrapper.style.zIndex = "1";
    if (img.parentNode) {
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
    }
    container = wrapper;
  }
  
  // Only show badges if certainty toggle is ON
  if (showCertainty) {
    addCertaintyBlob(container, score, confidence);
  }
  
  // Store score and confidence for later updates
  container.dataset.aiScore = score;
  if (confidence !== null && confidence !== undefined) {
    container.dataset.aiConfidence = confidence;
  }
  
  // Toggle blur on image click
  img.addEventListener("click", function() {
    const isBlurred = img.style.filter.includes("blur");
    if (isBlurred) {
      img.style.filter = "none";
    } else {
      img.style.filter = "blur(" + BLUR_PX + "px)";
    }
  });
  
  // Add feedback buttons if game mode is enabled
  if (typeof addFeedbackButtons !== 'undefined') {
    const checkGameMode = typeof isGameModeEnabled !== 'undefined' ? isGameModeEnabled : 
                         (typeof gameModeEnabled !== 'undefined' ? gameModeEnabled : () => false);
    if (checkGameMode()) {
      setTimeout(() => {
        addFeedbackButtons(img, score, confidence, true);
      }, 100);
    }
  }
}

/**
 * Outline AI image with green box instead of blurring
 */
function outlineImageWithConfidence(img, score, confidence = null) {
  if (img.dataset.aiOutline === "true") return;
  if (!img.complete || img.naturalWidth === 0) return;
  
  img.dataset.aiOutline = "true";
  
  // Store score and confidence on image for later updates
  img.dataset.aiScore = score;
  if (confidence !== null && confidence !== undefined) {
    img.dataset.aiConfidence = confidence;
  }
  
  // Ensure parent container is positioned
  let container = img.parentElement;
  if (!container || container.style.position !== 'relative') {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.isolation = "isolate";
    wrapper.style.zIndex = "1";
    if (img.parentNode) {
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
    }
    container = wrapper;
  } else {
    container.style.position = 'relative';
    container.style.isolation = "isolate";
    container.style.zIndex = "1";
  }
  
  // Add thin green outline box around image
  container.style.border = "1px solid rgba(76, 175, 80, 0.8)";
  container.style.borderRadius = "4px";
  container.style.padding = "2px";
  container.style.backgroundColor = "transparent";
  container.style.boxShadow = "none";
  container.style.cursor = "pointer";
  
  // Only show badges if certainty toggle is ON
  if (showCertainty) {
    addCertaintyBlob(container, score, confidence);
  }
  
  // Store score and confidence for later updates
  container.dataset.aiScore = score;
  if (confidence !== null && confidence !== undefined) {
    container.dataset.aiConfidence = confidence;
  }
  
  // Toggle outline on click
  container.addEventListener("click", function() {
    if (container.style.border === "none" || container.style.border === "") {
      container.style.border = "1px solid rgba(76, 175, 80, 0.8)";
      container.style.backgroundColor = "transparent";
    } else {
      container.style.border = "none";
      container.style.backgroundColor = "transparent";
    }
  });
  
  // Add feedback buttons if game mode is enabled
  if (typeof addFeedbackButtons !== 'undefined') {
    const checkGameMode = typeof isGameModeEnabled !== 'undefined' ? isGameModeEnabled : 
                         (typeof gameModeEnabled !== 'undefined' ? gameModeEnabled : () => false);
    if (checkGameMode()) {
      setTimeout(() => {
        addFeedbackButtons(img, score, confidence, true);
      }, 100);
    }
  }
}

/**
 * Scan and process images selectively
 */
async function scanImages(root) {
  if (!extensionEnabled) return;
  
  const images = Array.from(root.querySelectorAll("img:not([data-ai-scanned])"));
  
  // Filter and prioritize images
  const candidateImages = images.filter(img => {
    // Skip very small images (icons, avatars, thumbnails)
    if (img.width < 100 || img.height < 100) {
      img.dataset.aiScanned = "true";
      return false;
    }
    
    // Skip images that are too large (likely backgrounds)
    if (img.width > 2000 || img.height > 2000) {
      img.dataset.aiScanned = "true";
      return false;
    }
    
    // Skip if already processed
    if (img.dataset.aiReplaced === "true") return false;
    
    // Prioritize images with certain aspect ratios (typical for AI art)
    const aspectRatio = img.width / img.height;
    // Square-ish or portrait images are more likely to be AI art
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      // Very wide or very tall - less likely to be AI art, lower priority
      return false;
    }
    
    return true;
  });
  
  // Process images with a delay to avoid blocking
  for (let i = 0; i < candidateImages.length; i++) {
    const img = candidateImages[i];
    
    // Add small delay between processing to avoid blocking UI
    if (i > 0 && i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Wait for image to load
    if (!img.complete) {
      img.addEventListener("load", async function() {
        img.dataset.aiScanned = "true";
        
        if (typeof detectAIImage !== 'undefined') {
          try {
            const result = await detectAIImage(img);
        const minConfidence = result?.metadataBased ? 0.4 : 0.5;
        if (result && result.score >= IMAGE_THRESHOLD && result.confidence >= minConfidence) {
          blurImageWithConfidence(img, result.score, result.confidence);
          // Log detection to history
          if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
            window.closeaiHistory.logDetection('image', result.score, result.confidence, window.location.href, img.src, true);
          }
        }
      } catch (error) {
        // Silently fail
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
    // If metadata-based detection, use lower confidence requirement
    // Otherwise require both high score AND good confidence
    const minConfidence = result?.metadataBased ? 0.4 : 0.5;
    if (result && result.score >= IMAGE_THRESHOLD && result.confidence >= minConfidence) {
      blurImageWithConfidence(img, result.score, result.confidence);
      // Log detection to history
      if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
        window.closeaiHistory.logDetection('image', result.score, result.confidence, window.location.href, img.src, true);
      }
    }
      } catch (error) {
        // Silently fail
      }
    }
  }
}

/**
 * Remove all blur effects from the page
 */
function removeAllBlurs() {
  // Remove text blurs
  const blurredTexts = document.querySelectorAll('[data-ai-blur="true"]');
  blurredTexts.forEach(el => {
    el.dataset.aiBlur = "false";
    const span = el.querySelector('span[data-blurred="true"]');
    if (span) {
      span.style.filter = "none";
      span.dataset.blurred = "false";
    }
    // Remove confidence badges
    const badges = el.querySelectorAll('div[style*="top: 8px; right: 8px;"]');
    badges.forEach(badge => badge.remove());
  });

  // Remove image blurs
  const blurredImages = document.querySelectorAll('img[data-ai-blurred="true"]');
  blurredImages.forEach(img => {
    img.dataset.aiBlurred = "false";
    img.style.filter = "none";
    // Remove confidence badges
    const badges = img.parentElement?.querySelectorAll('div[style*="top: 8px; right: 8px;"]');
    badges?.forEach(badge => badge.remove());
  });
}

/**
 * Remove all outline effects from the page
 */
function removeAllOutlines() {
  // Remove text outlines
  const outlinedTexts = document.querySelectorAll('[data-ai-outline="true"]');
  outlinedTexts.forEach(el => {
    el.dataset.aiOutline = "false";
    el.style.border = "none";
    el.style.backgroundColor = "transparent";
    el.style.boxShadow = "none";
    el.style.padding = "";
    el.style.borderRadius = "";
    // Remove confidence badges
    const badges = el.querySelectorAll('div[style*="top: 8px; right: 8px;"]');
    badges.forEach(badge => badge.remove());
  });

  // Remove image outlines
  const outlinedImages = document.querySelectorAll('img[data-ai-outline="true"]');
  outlinedImages.forEach(img => {
    img.dataset.aiOutline = "false";
    const container = img.parentElement;
    if (container && container.style.border) {
      container.style.border = "none";
      container.style.backgroundColor = "transparent";
      container.style.boxShadow = "none";
      container.style.padding = "";
      container.style.borderRadius = "";
    }
    // Remove confidence badges
    const badges = container?.querySelectorAll('div[style*="top: 8px; right: 8px;"]');
    badges?.forEach(badge => badge.remove());
  });
}

/**
 * Enhanced scanning with async ML scoring
 */
async function scan(root) {
  if (!extensionEnabled) return;
  
  // Check per-site settings - whitelist check happens in scanImages too
  const currentDomain = window.location.hostname.replace(/^www\./, '');
  
  const elements = root.querySelectorAll("p, li, div[class*='content'], div[class*='text'], article");

  for (const el of elements) {
    if (el.dataset.aiBlur === "true" || el.dataset.aiOutline === "true") continue;
    if (el.dataset.aiScanned === "true") continue;

    const text = el.innerText;
    if (!text || text.trim().length < 40) continue;

    // Mark as scanned to avoid duplicate processing
    el.dataset.aiScanned = "true";

    // Quick synchronous check first
    const quickScore = scoreText(text);
    
    if (quickScore >= THRESHOLD) {
      blurWithCTA(el, quickScore, null); // No confidence for sync score
      
      // Log quick detection (will be refined later)
      if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
        window.closeaiHistory.logDetection('text', quickScore, null, window.location.href, text, false);
      }
      
      // Then refine with async ML scoring
      scoreTextAsync(text).then(result => {
        if (result && typeof result === 'object' && result.score !== undefined) {
          const refinedScore = result.score;
          const confidence = result.confidence || null;
          
          // Update if ML score is significantly different
          if (Math.abs(refinedScore - quickScore) > 0.15) {
            if (refinedScore >= THRESHOLD && el.dataset.aiBlur !== "true") {
              blurWithCTA(el, refinedScore, confidence);
              // Log detection to history
              if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
                window.closeaiHistory.logDetection('text', refinedScore, confidence, window.location.href, text, false);
              }
            } else if (refinedScore < THRESHOLD && el.dataset.aiBlur === "true") {
              // Remove blur if ML says it's not AI
              el.dataset.aiBlur = "false";
              el.innerHTML = text;
            }
          } else if (confidence !== null) {
            // Log detection to history (even if score didn't change much)
            if (refinedScore >= THRESHOLD && typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
              window.closeaiHistory.logDetection('text', refinedScore, confidence, window.location.href, text, false);
            }
            // Update confidence badge if score is similar
            blurWithCTA(el, refinedScore, confidence);
          }
        } else {
          // Fallback for old API
          const refinedScore = result || quickScore;
          if (Math.abs(refinedScore - quickScore) > 0.15) {
            if (refinedScore >= THRESHOLD && el.dataset.aiBlur !== "true") {
              blurWithCTA(el, refinedScore, null);
            }
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
  if (!extensionEnabled) return;
  
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

// Boot - check enabled state first
function initializeExtension() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['enabled', 'outlineMode', 'showCertainty'], (result) => {
      extensionEnabled = result.enabled !== false; // Default to true
      outlineMode = result.outlineMode === true;
      showCertainty = result.showCertainty === true;
      startScanning();
    });
  } else {
    // If storage not available, default to enabled and start scanning
    extensionEnabled = true;
    outlineMode = false;
    showCertainty = false;
    startScanning();
  }
}

function startScanning() {
  if (extensionEnabled) {
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
  }
}

// Initialize extension
initializeExtension();
