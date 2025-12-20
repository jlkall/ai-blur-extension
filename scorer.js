/**
 * Enhanced AI Text Scorer
 * Integrates robust ML models with statistical features
 */

// Ensure clamp is available (defined in signals.js, but provide fallback)
if (typeof clamp === 'undefined') {
  function clamp(n) {
    return Math.max(0, Math.min(1, n));
  }
}

/**
 * Enhanced scoring using ML detector with GPTZero-level features
 * Falls back to statistical features if ML model unavailable
 */
async function scoreParagraph(text) {
  // Try enhanced detector first (GPTZero-level features)
  if (typeof window !== 'undefined' && window.closeaiEnhancedDetector && window.closeaiEnhancedDetector.detectAIGeneratedEnhanced) {
    try {
      // Get base features from standard detector
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
      
      // Use enhanced detector with base features
      const enhancedResult = await window.closeaiEnhancedDetector.detectAIGeneratedEnhanced(text, baseFeatures);
      if (enhancedResult && enhancedResult.score !== undefined) {
        // Enhanced score with confidence weighting
        return {
          score: enhancedResult.score,
          confidence: enhancedResult.confidence || 0.7
        };
      }
    } catch (error) {
      console.warn("[CloseAI] Enhanced detection failed, trying standard ML:", error);
    }
  }

  // Try standard ML detector
  if (typeof detectAIGenerated !== 'undefined') {
    try {
      const result = await detectAIGenerated(text);
      if (result && result.score !== undefined) {
        // Combine ML score with confidence weighting
        return {
          score: result.score * (0.7 + 0.3 * (result.confidence || 0.5)),
          confidence: result.confidence || 0.5
        };
      }
    } catch (error) {
      console.warn("[CloseAI] ML detection failed, using fallback:", error);
    }
  }

  // Fallback to statistical features
  const scores = [
    { weight: 0.35, value: entropyScore(text) },
    { weight: 0.20, value: sentenceVarianceScore(text) },
    { weight: 0.15, value: stopwordDensityScore(text) },
    { weight: 0.15, value: listDensityScore(text) },
    { weight: 0.15, value: hedgingScore(text) }
  ];

  const fallbackScore = scores.reduce((sum, s) => sum + s.weight * s.value, 0);
  return {
    score: fallbackScore,
    confidence: 0.5 // Lower confidence for statistical-only
  };
}

/**
 * Synchronous version for immediate scoring (uses statistical features only)
 * This function must be available globally for content.js
 */
function scoreParagraphSync(text) {
  // Ensure all helper functions are available (from signals.js)
  if (typeof entropyScore === 'undefined' || 
      typeof sentenceVarianceScore === 'undefined' ||
      typeof stopwordDensityScore === 'undefined' ||
      typeof listDensityScore === 'undefined' ||
      typeof hedgingScore === 'undefined') {
    console.error("[CloseAI] Required scoring functions not loaded. Available:", {
      entropyScore: typeof entropyScore,
      sentenceVarianceScore: typeof sentenceVarianceScore,
      stopwordDensityScore: typeof stopwordDensityScore,
      listDensityScore: typeof listDensityScore,
      hedgingScore: typeof hedgingScore
    });
    // Fallback scoring
    const words = text.trim().split(/\s+/).length;
    if (words > 150) return 0.9;
    if (words > 100) return 0.7;
    if (words > 60) return 0.5;
    if (words > 40) return 0.3;
    return 0.1;
  }

  const scores = [
    { weight: 0.35, value: entropyScore(text) },
    { weight: 0.20, value: sentenceVarianceScore(text) },
    { weight: 0.15, value: stopwordDensityScore(text) },
    { weight: 0.15, value: listDensityScore(text) },
    { weight: 0.15, value: hedgingScore(text) }
  ];

  return scores.reduce((sum, s) => sum + s.weight * s.value, 0);
}

// Verify function is defined (for debugging)
console.log("[CloseAI] scoreParagraphSync defined:", typeof scoreParagraphSync);
