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
 * Enhanced scoring using ML detector
 * Falls back to statistical features if ML model unavailable
 */
async function scoreParagraph(text) {
  // Try to use ML detector first
  if (typeof detectAIGenerated !== 'undefined') {
    try {
      const result = await detectAIGenerated(text);
      if (result && result.score !== undefined) {
        // Combine ML score with confidence weighting
        return result.score * (0.7 + 0.3 * result.confidence);
      }
    } catch (error) {
      console.warn("[AI BLUR] ML detection failed, using fallback:", error);
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

  return scores.reduce((sum, s) => sum + s.weight * s.value, 0);
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
    console.error("[AI BLUR] Required scoring functions not loaded. Available:", {
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
console.log("[AI BLUR] scoreParagraphSync defined:", typeof scoreParagraphSync);
