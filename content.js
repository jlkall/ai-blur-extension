console.log("[CloseAI] Enhanced ML detection loaded");

const THRESHOLD = 0.55; // High threshold to minimize false positives - only flag clearly AI content
const IMAGE_THRESHOLD = 0.40; // Threshold for AI image detection (with metadata, can be slightly lower)

// Cloud detection settings (opt-in, privacy-preserving)
const CLOUD_API_URL = 'https://closeai-detection.workers.dev';

// Known AI writing service domains - boost detection ONLY for these specific domains
// Only include domains that are explicitly AI content generators, not general sites
const AI_WRITING_DOMAINS = [
  'myessaywriter.ai',
  'essaywriter.ai',
  'jenni.ai',
  'writesonic.com',
  'copy.ai',
  'jasper.ai',
  'rytr.me',
  'simplified.com'
];
const BLUR_PX = 8;

// Extension enabled state (default to true)
let extensionEnabled = true;
let outlineMode = false;
let showCertainty = false;
let nukeMode = false; // Default to false - only true if explicitly set to true
let cloudDetectionEnabled = false; // Cloud detection (opt-in, privacy-preserving)

// Debug function to check current state
function debugState() {
  console.log("[CloseAI] Current state - enabled:", extensionEnabled, "nukeMode:", nukeMode, "outlineMode:", outlineMode, "showCertainty:", showCertainty);
}

// Load enabled state from storage (with defensive check)
function loadEnabledState() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['enabled', 'outlineMode', 'showCertainty', 'nukeMode', 'toggleVisibility', 'cloudDetection'], (result) => {
      extensionEnabled = result.enabled !== false; // Default to true
      
      // Check toggle visibility - if a toggle is hidden, treat it as OFF
      const visibility = result.toggleVisibility || {};
      
      // If outlineMode toggle is hidden, force it to false
      if (visibility.outlineMode === false) {
        outlineMode = false;
      } else {
        outlineMode = result.outlineMode === true;
      }
      
      // If showCertainty toggle is hidden, force it to false
      if (visibility.showCertainty === false) {
        showCertainty = false;
      } else {
        showCertainty = result.showCertainty === true;
      }
      
      // If nukeMode toggle is hidden, force it to false
      if (visibility.nukeMode === false) {
        nukeMode = false;
        console.log("[CloseAI] nukeMode toggle is hidden, forcing to false");
      } else {
        // Only set nukeMode to true if explicitly set to true in storage
        // If undefined, null, false, or any other value, set to false
        nukeMode = (result.nukeMode === true) ? true : false;
      }
      // Load cloud detection preference
      cloudDetectionEnabled = result.cloudDetection === true;
      
      console.log("[CloseAI] State loaded (loadEnabledState) - enabled:", extensionEnabled, "nukeMode:", nukeMode, "outlineMode:", outlineMode, "showCertainty:", showCertainty, "cloudDetection:", cloudDetectionEnabled, "storage nukeMode:", result.nukeMode);
      
      // Safety check: ensure nukeMode is explicitly false if not true
      if (nukeMode !== true) {
        nukeMode = false;
      }
      
      if (!extensionEnabled) {
        console.log("[CloseAI] Extension is disabled");
      }
    });
  }
}

// Load state on initialization (early load, but initializeExtension will override)
loadEnabledState();

// Listen for toggle messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getHistory') {
      // Return detection history
      if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.getHistory) {
        window.closeaiHistory.getHistory((history) => {
          sendResponse({ history: history });
        });
        return true; // Keep channel open for async response
      } else {
        sendResponse({ history: [] });
      }
    } else if (message.action === 'toggle') {
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
    } else if (message.action === 'toggleCloudDetection') {
      cloudDetectionEnabled = message.enabled === true;
      console.log("[CloseAI] Cloud detection toggled:", cloudDetectionEnabled ? "enabled" : "disabled");
      sendResponse({ success: true });
    } else if (message.action === 'toggleNukeMode') {
      // Only set to true if explicitly true, otherwise force to false
      if (message.enabled === true) {
        nukeMode = true;
        // Nuke mode toggled via message
      } else {
        nukeMode = false;
        console.log("[CloseAI] Nuke mode DISABLED via message");
      }
      
      // Also update storage to ensure consistency
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ nukeMode: nukeMode }, () => {
          console.log("[CloseAI] Storage updated - nukeMode:", nukeMode);
        });
      }
      
      // Re-scan to apply nuke mode
      if (extensionEnabled) {
        scan(document.body);
        scanImages(document.body);
      }
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
  
  // Try optimized detector first (best accuracy)
  if (typeof window !== 'undefined' && window.closeaiOptimizedDetector && window.closeaiOptimizedDetector.detectAIGeneratedOptimized) {
    try {
      // Get base features from standard detector (if available)
      let baseFeatures = {};
      if (typeof detectAIGenerated !== 'undefined') {
        try {
          const baseResult = await detectAIGenerated(text);
          if (baseResult && baseResult.features) {
            baseFeatures = baseResult.features;
          }
        } catch (e) {
          // Continue without base features
        }
      }
      
      // Use optimized detector (fastest and most accurate)
      const optimizedResult = await window.closeaiOptimizedDetector.detectAIGeneratedOptimized(text, baseFeatures);
      if (optimizedResult && optimizedResult.score !== undefined) {
        const result = {
          score: optimizedResult.score,
          confidence: optimizedResult.confidence || 0.7
        };
        
        // Cache the result
        if (scoreCache.size >= CACHE_SIZE) {
          const firstKey = scoreCache.keys().next().value;
          scoreCache.delete(firstKey);
        }
        scoreCache.set(cacheKey, result);
        
        return result;
      }
    } catch (error) {
      console.warn("[CloseAI] Optimized detection failed, trying enhanced:", error);
    }
  }
  
  // Try enhanced detector
  if (typeof window !== 'undefined' && window.closeaiEnhancedDetector && window.closeaiEnhancedDetector.detectAIGeneratedEnhanced) {
    try {
      let baseFeatures = {};
      if (typeof detectAIGenerated !== 'undefined') {
        try {
          const baseResult = await detectAIGenerated(text);
          if (baseResult && baseResult.features) {
            baseFeatures = baseResult.features;
          }
        } catch (e) {
          // Continue without base features
        }
      }
      
      const enhancedResult = await window.closeaiEnhancedDetector.detectAIGeneratedEnhanced(text, baseFeatures);
      if (enhancedResult && enhancedResult.score !== undefined) {
        const result = {
          score: enhancedResult.score,
          confidence: enhancedResult.confidence || 0.7
        };
        
        // Cache the result
        if (scoreCache.size >= CACHE_SIZE) {
          const firstKey = scoreCache.keys().next().value;
          scoreCache.delete(firstKey);
        }
        scoreCache.set(cacheKey, result);
        
        return result;
      }
    } catch (error) {
      console.warn("[CloseAI] Enhanced detection failed, trying standard ML:", error);
    }
  }
  
  // Try standard ML detector
  try {
    if (typeof detectAIGenerated !== 'undefined') {
      const result = await detectAIGenerated(text);
      if (result && typeof result === 'object' && result.score !== undefined) {
        // Return object with score and confidence
        const score = result.score;
        const confidence = result.confidence || null;
        
        const finalResult = { score, confidence };
        
        // Cache the result
        if (scoreCache.size >= CACHE_SIZE) {
          const firstKey = scoreCache.keys().next().value;
          scoreCache.delete(firstKey);
        }
        scoreCache.set(cacheKey, finalResult);
        
        return finalResult;
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
  
  // Final fallback to statistical features
  const fallbackScore = typeof scoreParagraphSync === 'function' ? scoreParagraphSync(text) : 0.5;
  const fallbackResult = { score: fallbackScore, confidence: null };
  
  // Cache fallback result
  if (scoreCache.size >= CACHE_SIZE) {
    const firstKey = scoreCache.keys().next().value;
    scoreCache.delete(firstKey);
  }
  scoreCache.set(cacheKey, fallbackResult);
  
  return fallbackResult;
}

/**
 * Extract features from text (privacy-preserving - no full text sent)
 */
function extractFeaturesOnly(text) {
  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Calculate entropy
  const freq = {};
  for (const c of text) freq[c] = (freq[c] || 0) + 1;
  const len = text.length;
  let entropy = 0;
  for (const c in freq) {
    const p = freq[c] / len;
    entropy -= p * Math.log2(p);
  }
  
  // Calculate word diversity
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const wordDiversity = uniqueWords.size / words.length;
  
  // Calculate sentence variance
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  const mean = sentenceLengths.length > 0 ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length : 0;
  const variance = sentenceLengths.length > 0 ? sentenceLengths.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sentenceLengths.length : 0;
  
  // Stopword density
  const STOPWORDS = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'of', 'in', 'for', 'with']);
  const stopwordCount = words.filter(w => STOPWORDS.has(w.toLowerCase())).length;
  const stopwordDensity = words.length > 0 ? stopwordCount / words.length : 0;
  
  // Punctuation density
  const punctCount = (text.match(/[.,!?;:]/g) || []).length;
  const punctuationDensity = text.length > 0 ? punctCount / text.length : 0;
  
  // Word entropy
  const wordFreq = {};
  words.forEach(w => {
    const lower = w.toLowerCase();
    wordFreq[lower] = (wordFreq[lower] || 0) + 1;
  });
  let wordEntropy = 0;
  if (words.length > 0) {
    for (const w in wordFreq) {
      const p = wordFreq[w] / words.length;
      wordEntropy -= p * Math.log2(p);
    }
  }
  
  // Repetition (n-gram)
  const trigrams = [];
  for (let i = 0; i < words.length - 2; i++) {
    trigrams.push(words.slice(i, i + 3).join(' ').toLowerCase());
  }
  const uniqueTrigrams = new Set(trigrams);
  const repetition = trigrams.length > 0 ? 1 - (uniqueTrigrams.size / trigrams.length) : 0;
  
  return {
    entropy: entropy,
    avgSentenceLength: mean,
    wordDiversity: wordDiversity,
    punctuationDensity: punctuationDensity,
    stopwordDensity: stopwordDensity,
    sentenceVariance: variance,
    repetition: repetition,
    wordEntropy: wordEntropy
  };
}

/**
 * Hash text for caching (simple hash function)
 */
function hashText(text) {
  let hash = 0;
  const len = Math.min(text.length, 200); // Only hash first 200 chars
  for (let i = 0; i < len; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Detect AI using cloud API (privacy-preserving)
 */
async function detectWithCloud(text, localResult) {
  if (!cloudDetectionEnabled || !CLOUD_API_URL || CLOUD_API_URL.includes('YOUR-SUBDOMAIN')) {
    return localResult;
  }
  
  try {
    // Extract features only (no full text)
    const features = extractFeaturesOnly(text);
    const hash = hashText(text);
    
    // Send to cloud API
    const response = await fetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hash: hash,
        features: features,
        metadata: {
          length: text.length,
          language: 'en' // Could detect language if needed
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Cloud API error: ${response.status}`);
    }
    
    const cloudResult = await response.json();
    
    // Combine local + cloud scores (weighted average)
    if (cloudResult && cloudResult.score !== undefined) {
      const combinedScore = (localResult.score * 0.4) + (cloudResult.score * 0.6);
      const combinedConfidence = Math.max(
        localResult.confidence || 0.5,
        cloudResult.confidence || 0.5
      );
      
      return {
        score: combinedScore,
        confidence: combinedConfidence,
        source: 'hybrid',
        localScore: localResult.score,
        cloudScore: cloudResult.score
      };
    }
    
    return localResult;
  } catch (error) {
    // Silently fallback to local if cloud fails
    console.warn("[CloseAI] Cloud detection failed, using local:", error.message);
    return localResult;
  }
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

  // CRITICAL: Only remove text if nuke mode is EXPLICITLY enabled
  // Simple, direct check - no async operations that could cause race conditions
  if (nukeMode === true) {
    // Nuke mode active - removing element
    // Only remove if element still exists
    if (el.parentNode) {
      el.remove();
    }
    return;
  }

  // GUARANTEE: If nukeMode is NOT true, text will NEVER be removed
  // DEFAULT BEHAVIOR: When extension is enabled, text should BLUR by default
  // This function only blurs or outlines - never removes (unless nuke mode is explicitly on)

  // If nukeMode is NOT true, proceed with blur/outline (NEVER remove)
  // Default action: BLUR the text (unless outline mode is on)
  performBlur(el, score, confidence);
}

function performBlur(el, score, confidence = null) {
  // This function handles blur/outline - NEVER removes text
  // GUARANTEE: This function will NEVER call el.remove() or permanently delete text
  // DEFAULT BEHAVIOR: When extension is enabled, text should BLUR (unless outline mode is on)

  // Check if outline mode is enabled
  if (outlineMode) {
    outlineWithCTA(el, score, confidence);
    return;
  }

  // DEFAULT: Blur the text (this is the default behavior when extension is enabled)
  // Store original text BEFORE any modifications
  const originalText = el.innerText || el.textContent || '';
  if (!originalText || originalText.trim().length === 0) {
    // No text content to blur, skipping element
    return;
  }

  el.dataset.aiBlur = "true";
  el.style.position = "relative";
  el.style.isolation = "isolate"; // Create new stacking context
  el.style.zIndex = "1"; // Low z-index for the container

  const span = document.createElement("span");
  span.textContent = originalText; // Use stored original text
  span.dataset.blurred = "true";

  // Apply blur filter (DEFAULT behavior when extension is enabled)
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

  // Replace innerHTML but preserve text in span (text is NOT removed, just wrapped and blurred)
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
  
  // Nuke mode: remove image completely (only if explicitly enabled)
  // Check explicitly for true to avoid any truthy issues
  // ADDITIONAL SAFETY: Double-check nukeMode is actually true before removing
  if (nukeMode === true) {
    // Nuke mode active - removing image
    img.remove();
    return;
  }
  
  // If nukeMode is not true, proceed with normal blur/outline
  
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
 * Check if an element is inside a map container (Google Maps, Apple Maps, etc.)
 * This prevents scanning any content (text or images) within map containers
 */
function isInMapContainer(element) {
  if (!element) return false;
  
  let currentElement = element;
  const maxDepth = 20; // Check up to 20 levels up
  
  for (let i = 0; i < maxDepth && currentElement; i++) {
    const className = (currentElement.className || '').toLowerCase();
    const id = (currentElement.id || '').toLowerCase();
    const tagName = (currentElement.tagName || '').toLowerCase();
    const role = (currentElement.getAttribute?.('role') || '').toLowerCase();
    const ariaLabel = (currentElement.getAttribute?.('aria-label') || '').toLowerCase();
    
    // Google Maps specific patterns (most common)
    if (className.includes('gm-') || 
        className.includes('gm-style') || 
        className.includes('gm-map') ||
        className.includes('gmnoprint') ||
        className.includes('gmnoscreen') ||
        className.includes('gm-style-pbc') ||
        id.includes('gm-') ||
        id.includes('google-map') ||
        id.includes('google-maps')) {
      return true;
    }
    
    // Check for map-related class names (comprehensive list)
    const mapClassPatterns = [
      'map', 'maps', 'map-container', 'map-canvas', 'map-view', 'map-wrapper',
      'google-map', 'google-maps', 'apple-map', 'apple-maps',
      'leaflet', 'mapbox', 'map-tile', 'map-tiles', 'mapboxgl',
      'mapbox-map', 'mapboxgl-map', 'mapboxgl-canvas',
      'ol-viewport', 'ol-map', // OpenLayers
      'esri-view', 'esri-map', // ArcGIS
      'map-viewport', 'map-controls', 'map-overlay',
      'places-container', // Google Places
      'local-results' // Google local results with maps
    ];
    
    for (const pattern of mapClassPatterns) {
      if (className.includes(pattern)) {
        return true;
      }
    }
    
    // Check for map-related IDs
    const mapIdPatterns = [
      'map', 'maps', 'google-map', 'google-maps', 'apple-map', 'apple-maps',
      'map-container', 'map-canvas', 'map-view', 'map-wrapper',
      'mapbox', 'leaflet-map', 'mapboxgl-map'
    ];
    
    for (const pattern of mapIdPatterns) {
      if (id.includes(pattern)) {
        return true;
      }
    }
    
    // Check for map-related roles and aria-labels
    if (role === 'application' && (className.includes('map') || id.includes('map') || ariaLabel.includes('map'))) {
      return true;
    }
    
    if (ariaLabel.includes('map') || ariaLabel.includes('google map') || ariaLabel.includes('apple map')) {
      return true;
    }
    
    // Check if inside an iframe that contains maps
    if (tagName === 'iframe') {
      const iframeSrc = (currentElement.src || '').toLowerCase();
      if (iframeSrc.includes('maps.googleapis.com') || 
          iframeSrc.includes('maps.google.com') ||
          iframeSrc.includes('maps.apple.com') ||
          iframeSrc.includes('google.com/maps') ||
          iframeSrc.includes('apple.com/maps') ||
          (iframeSrc.includes('map') && (iframeSrc.includes('google') || iframeSrc.includes('apple')))) {
        return true;
      }
    }
    
    // Check for Google Maps specific attributes
    if (currentElement.hasAttribute && (
        currentElement.hasAttribute('data-map') ||
        currentElement.hasAttribute('data-google-map') ||
        currentElement.getAttribute('data-type') === 'map' ||
        currentElement.getAttribute('data-ved') // Google Maps often has data-ved
      )) {
      return true;
    }
    
    // Check for Google Maps widget indicators
    if (currentElement.querySelector && (
        currentElement.querySelector('[class*="gm-"]') ||
        currentElement.querySelector('[id*="map"]') ||
        currentElement.querySelector('iframe[src*="maps"]')
      )) {
      return true;
    }
    
    currentElement = currentElement.parentElement;
  }
  
  // Aggressive check for Google Maps on Google search results
  if (window.location.hostname.includes('google.com') && window.location.pathname === '/search') {
    // Check if element is in the right column (where Google embeds maps)
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    
    // If element is in the right 35% of the screen on Google search, check more carefully
    if (rect.left > windowWidth * 0.65) {
      // Look for Google Maps indicators in the DOM tree
      let checkElement = element;
      for (let j = 0; j < 10 && checkElement; j++) {
        // Check for Google Maps iframe
        const iframes = checkElement.querySelectorAll?.('iframe') || [];
        for (const iframe of iframes) {
          const iframeSrc = (iframe.src || '').toLowerCase();
          if (iframeSrc.includes('maps.googleapis.com') || 
              iframeSrc.includes('maps.google.com') ||
              iframeSrc.includes('/maps/')) {
            return true;
          }
        }
        
        // Check for any element with gm- classes (Google Maps)
        const gmElements = checkElement.querySelectorAll?.('[class*="gm-"]') || [];
        if (gmElements.length > 0) {
          return true;
        }
        
        // Check parent for map indicators
        const parentClass = (checkElement.className || '').toLowerCase();
        const parentId = (checkElement.id || '').toLowerCase();
        if (parentClass.includes('gm-') || parentId.includes('map')) {
          return true;
        }
        
        checkElement = checkElement.parentElement;
      }
      
      // Also check nearby elements for map indicators
      try {
        const nearbyElements = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        for (const nearby of nearbyElements) {
          if (nearby !== element) {
            const nearbyClass = (nearby.className || '').toLowerCase();
            const nearbyId = (nearby.id || '').toLowerCase();
            const nearbyTag = (nearby.tagName || '').toLowerCase();
            
            if (nearbyClass.includes('gm-') || 
                nearbyClass.includes('map') || 
                nearbyId.includes('map') || 
                nearbyTag === 'iframe' ||
                (nearbyTag === 'div' && nearbyClass.includes('local'))) {
              // Check if this nearby element is actually a map
              const nearbyIframes = nearby.querySelectorAll?.('iframe') || [];
              for (const iframe of nearbyIframes) {
                const iframeSrc = (iframe.src || '').toLowerCase();
                if (iframeSrc.includes('maps') || iframeSrc.includes('googleapis')) {
                  return true;
                }
              }
              
              // If it has gm- classes, it's definitely a map
              if (nearbyClass.includes('gm-')) {
                return true;
              }
            }
          }
        }
      } catch (e) {
        // elementsFromPoint might fail in some cases, ignore
      }
    }
  }
  
  return false;
}

/**
 * Check if an image is from a map service (Google Maps, Apple Maps, etc.)
 */
function isMapImage(img) {
  // First check if image is in a map container
  if (isInMapContainer(img)) {
    return true;
  }
  
  // Check image source URL for map-related patterns
  const src = (img.src || img.currentSrc || '').toLowerCase();
  const mapPatterns = [
    'maps.googleapis.com',
    'maps.gstatic.com',
    'googleapis.com/maps',
    'mapbox.com',
    'openstreetmap.org',
    'leaflet',
    'map-tile',
    'map-tiles',
    'tile.openstreetmap',
    'cartodb-basemaps',
    'stamen-tiles',
    'arcgis.com',
    'bing.com/maps',
    'apple.com/maps',
    'mapquest',
    'here.com',
    'tomtom',
    'mapdata',
    '/maps/api/',
    '/maps/vt/',
    '/maps/api/staticmap',
    'streetview',
    'satellite',
    'terrain',
    'roadmap'
  ];
  
  for (const pattern of mapPatterns) {
    if (src.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Scan and process images selectively
 */
async function scanImages(root) {
  if (!extensionEnabled) return;
  
  const images = Array.from(root.querySelectorAll("img:not([data-ai-scanned])"));
  
  // First, check if any were pre-blocked and restore if false positive
  images.forEach(img => {
    if (img.dataset.aiBlocked === 'true' && img.dataset.aiPendingCheck === 'true') {
      // Re-check with full detection
      img.dataset.aiPendingCheck = 'false';
    }
  });
  
  // Filter and prioritize images
  const candidateImages = images.filter(img => {
    // Skip if image is inside a map container (Google Maps, Apple Maps, etc.)
    if (isInMapContainer(img)) {
      img.dataset.aiScanned = "true";
      return false;
    }
    
    // Skip map images (Google Maps, Apple Maps, etc.)
    if (isMapImage(img)) {
      img.dataset.aiScanned = "true";
      return false;
    }
    
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
          // If pre-blocked, keep it blocked; otherwise blur
          if (img.dataset.aiBlocked === 'true') {
            // Already blocked, just log
            if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
              window.closeaiHistory.logDetection('image', result.score, result.confidence, window.location.href, img.src || img.dataset.originalSrc, true);
            }
          } else {
            blurImageWithConfidence(img, result.score, result.confidence);
            // Log detection to history
            if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
              window.closeaiHistory.logDetection('image', result.score, result.confidence, window.location.href, img.src, true);
            }
          }
        } else if (img.dataset.aiBlocked === 'true' && img.dataset.aiPendingCheck === 'false') {
          // False positive - restore the image
          if (typeof window.closeaiPreRender !== 'undefined' && window.closeaiPreRender.restoreElement) {
            window.closeaiPreRender.restoreElement(img);
            // Restore original src if it was blocked
            if (img.dataset.originalSrc) {
              img.src = img.dataset.originalSrc;
              delete img.dataset.originalSrc;
            }
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
      // If pre-blocked, keep it blocked; otherwise blur
      if (img.dataset.aiBlocked === 'true') {
        // Already blocked, just log
        if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
          window.closeaiHistory.logDetection('image', result.score, result.confidence, window.location.href, img.src || img.dataset.originalSrc, true);
        }
      } else {
        blurImageWithConfidence(img, result.score, result.confidence);
        // Log detection to history
        if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
          window.closeaiHistory.logDetection('image', result.score, result.confidence, window.location.href, img.src, true);
        }
      }
    } else if (img.dataset.aiBlocked === 'true' && img.dataset.aiPendingCheck === 'false') {
      // False positive - restore the image
      if (typeof window.closeaiPreRender !== 'undefined' && window.closeaiPreRender.restoreElement) {
        window.closeaiPreRender.restoreElement(img);
        // Restore original src if it was blocked
        if (img.dataset.originalSrc) {
          img.src = img.dataset.originalSrc;
          delete img.dataset.originalSrc;
        }
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
  
  // More comprehensive element selection for better text detection
  // Include main content areas, article bodies, and common content containers
  const elements = root.querySelectorAll("p, li, div[class*='content'], div[class*='text'], article, section, h1, h2, h3, h4, h5, h6, blockquote, span[class*='text'], span[class*='content'], div[class*='article'], div[class*='post'], div[class*='entry'], main p, main div, [role='article'] p, [role='article'] div, .article-body p, .article-body div, .content-body p, .content-body div");

  for (const el of elements) {
    if (el.dataset.aiBlur === "true" || el.dataset.aiOutline === "true") continue;
    if (el.dataset.aiScanned === "true") continue;
    
    // Skip if element is inside a map container
    if (isInMapContainer(el)) {
      el.dataset.aiScanned = "true";
      continue;
    }

    // Get text content - try innerText first, fallback to textContent
    const text = el.innerText || el.textContent || '';
    if (!text || text.trim().length < 40) continue;
    
    // Skip if text is mostly whitespace or special characters
    const textRatio = text.trim().length / text.length;
    if (textRatio < 0.5) continue; // Skip if more than 50% whitespace

    // Mark as scanned to avoid duplicate processing
    el.dataset.aiScanned = "true";

    // Check if we're on a known AI writing service domain (exact match only)
    const currentDomain = window.location.hostname.replace(/^www\./, '').toLowerCase();
    const isAIWritingDomain = AI_WRITING_DOMAINS.some(domain => currentDomain === domain || currentDomain.endsWith('.' + domain));
    
    // Only slightly lower threshold for AI writing domains (very conservative)
    const effectiveThreshold = isAIWritingDomain ? THRESHOLD * 0.90 : THRESHOLD; // Only 10% lower for AI domains

    // Quick synchronous check first (for immediate feedback)
    let quickScore = scoreText(text);
    
    // Only boost score if on AI writing domain AND score is already high
    if (isAIWritingDomain && quickScore > 0.45) {
      quickScore = Math.min(1, quickScore * 1.10); // Small 10% boost, only for high scores
    }
    
    // If quick score passes threshold, blur immediately
    if (quickScore >= effectiveThreshold) {
      blurWithCTA(el, quickScore, null);
      
      // Log quick detection (will be refined later)
      if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
        window.closeaiHistory.logDetection('text', quickScore, null, window.location.href, text, false);
      }
    }
    
    // Always run async ML scoring for better accuracy, even if quick score is below threshold
    // This catches cases where statistical features miss AI text but ML detects it
    // Capture variables for async callback
    const capturedEffectiveThreshold = effectiveThreshold;
    const capturedIsAIWritingDomain = isAIWritingDomain;
    const capturedText = text;
    
    // First get local result
    scoreTextAsync(text).then(async localResult => {
      // If cloud is enabled and confidence is low, try cloud detection
      let result = localResult;
      if (cloudDetectionEnabled && localResult.confidence < 0.75) {
        result = await detectWithCloud(text, localResult);
      }
      
      // Continue with result (now potentially enhanced by cloud)
      return result;
    }).then(result => {
        if (result && typeof result === 'object' && result.score !== undefined) {
          let refinedScore = result.score;
          const confidence = result.confidence || null;
          
          // Only boost score if on AI writing domain AND score is already somewhat high
          // This prevents false positives on legitimate content
          if (capturedIsAIWritingDomain && refinedScore > 0.45) {
            refinedScore = Math.min(1, refinedScore * 1.10); // Small 10% boost, only for high scores
          }
          
          // Always update if ML score is different OR if it's above threshold
          // This ensures better detection accuracy
          if (refinedScore >= capturedEffectiveThreshold) {
            // If ML says it's AI, blur it (even if quick score was lower)
            if (el.dataset.aiBlur !== "true" && el.dataset.aiOutline !== "true") {
              blurWithCTA(el, refinedScore, confidence);
            } else if (el.dataset.aiBlur === "true") {
              // Update existing blur with refined score and confidence
              blurWithCTA(el, refinedScore, confidence);
            }
            
            // Log detection to history
            if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
              window.closeaiHistory.logDetection('text', refinedScore, confidence, window.location.href, capturedText, false);
            }
          } else if (refinedScore < capturedEffectiveThreshold && el.dataset.aiBlur === "true") {
            // Remove blur if ML says it's not AI (restore original text)
            el.dataset.aiBlur = "false";
            // Restore text content safely
            const span = el.querySelector('span[data-blurred="true"]');
            if (span && span.textContent) {
              el.textContent = span.textContent;
            } else {
              el.textContent = capturedText;
            }
            // Remove blur styling
            el.style.filter = "none";
            el.style.position = "";
            el.style.isolation = "";
            el.style.zIndex = "";
          } else if (confidence !== null && refinedScore >= capturedEffectiveThreshold * 0.8) {
            // Log detection to history even if score is close to threshold
            if (typeof window.closeaiHistory !== 'undefined' && window.closeaiHistory.logDetection) {
              window.closeaiHistory.logDetection('text', refinedScore, confidence, window.location.href, capturedText, false);
            }
          }
        } else {
          // Fallback for old API
          const refinedScore = typeof result === 'number' ? result : (result?.score || quickScore);
          if (refinedScore >= capturedEffectiveThreshold && el.dataset.aiBlur !== "true") {
            blurWithCTA(el, refinedScore, null);
          }
        }
      }).catch((error) => {
        // Silently handle expected errors (context invalidation, CORS, etc.)
        const errorMessage = error?.message || String(error || '');
        const isExpectedError = 
          errorMessage.includes('Extension context invalidated') ||
          errorMessage.includes('CORS') ||
          errorMessage.includes('context') ||
          errorMessage.includes('invalidated');
        
        // Only log unexpected errors
        if (error && !isExpectedError) {
          console.warn("[CloseAI] Async scoring error:", errorMessage);
        }
        
        // If async scoring fails, fall back to quick score
        if (quickScore >= capturedEffectiveThreshold && el.dataset.aiBlur !== "true") {
          blurWithCTA(el, quickScore, null);
        }
      });
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
    chrome.storage.local.get(['enabled', 'outlineMode', 'showCertainty', 'nukeMode', 'gameMode', 'toggleVisibility'], (result) => {
      extensionEnabled = result.enabled !== false; // Default to true
      
      // Check toggle visibility - if a toggle is hidden, treat it as OFF
      const visibility = result.toggleVisibility || {};
      
      // If outlineMode toggle is hidden, force it to false
      if (visibility.outlineMode === false) {
        outlineMode = false;
        console.log("[CloseAI] outlineMode toggle is hidden, forcing to false");
      } else {
        outlineMode = result.outlineMode === true;
      }
      
      // If showCertainty toggle is hidden, force it to false
      if (visibility.showCertainty === false) {
        showCertainty = false;
        console.log("[CloseAI] showCertainty toggle is hidden, forcing to false");
      } else {
        showCertainty = result.showCertainty === true;
      }
      
      // If nukeMode toggle is hidden, force it to false
      const storageNukeMode = result.nukeMode;
      if (visibility.nukeMode === false) {
        nukeMode = false;
        console.log("[CloseAI] nukeMode toggle is hidden, forcing to false (was:", storageNukeMode, ")");
      } else {
        // CRITICAL: Only allow nukeMode to be true if explicitly set to true in storage
        // Default to false for safety
        if (storageNukeMode === true) {
          nukeMode = true;
          // Nuke mode is enabled
        } else {
          // Force to false if undefined, null, false, or any other value
          nukeMode = false;
          // If storage has a truthy but not explicitly true value, clear it
          if (storageNukeMode !== undefined && storageNukeMode !== false && storageNukeMode !== true) {
            // Invalid nukeMode value in storage, clearing
            chrome.storage.local.set({ nukeMode: false });
          }
        }
      }
      
      // FINAL SAFETY CHECK: If nukeMode is somehow still truthy but not explicitly true, force to false
      if (nukeMode !== true && nukeMode !== false) {
        console.error("[CloseAI] CRITICAL: nukeMode has invalid value, forcing to false:", nukeMode);
        nukeMode = false;
        chrome.storage.local.set({ nukeMode: false });
      }
      
      // Load cloud detection preference
      cloudDetectionEnabled = result.cloudDetection === true;
      
      console.log("[CloseAI] Initialized (initializeExtension) - enabled:", extensionEnabled, "nukeMode:", nukeMode, "outlineMode:", outlineMode, "showCertainty:", showCertainty, "cloudDetection:", cloudDetectionEnabled);
      console.log("[CloseAI] Storage nukeMode value:", storageNukeMode, "type:", typeof storageNukeMode, "final nukeMode:", nukeMode);
      
      // If nukeMode is true, warn the user clearly
      if (nukeMode === true) {
        // Nuke mode is active
      }
      
      startScanning();
    });
  } else {
    // If storage not available, default to enabled and start scanning
    extensionEnabled = true;
    outlineMode = false;
    showCertainty = false;
    nukeMode = false; // Explicitly false by default
    console.log("[CloseAI] Initialized (no storage) - enabled:", extensionEnabled, "nukeMode:", nukeMode);
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

