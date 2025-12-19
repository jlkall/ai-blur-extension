/**
 * Enhanced AI Text Scorer
 * Integrates robust ML models with statistical features
 */

// Legacy signal functions (kept for backward compatibility)
function entropyScore(text) {
  const freq = {};
  for (const c of text) freq[c] = (freq[c] || 0) + 1;

  const len = text.length;
  let entropy = 0;

  for (const c in freq) {
    const p = freq[c] / len;
    entropy -= p * Math.log2(p);
  }

  return clamp(1 - entropy / 5);
}

function sentenceVarianceScore(text) {
  const sentences = text.split(/[.!?]/).filter(Boolean);
  if (sentences.length < 3) return 0;

  const lengths = sentences.map(s => s.split(/\s+/).length);
  const mean = lengths.reduce((a,b)=>a+b,0) / lengths.length;
  const variance = lengths.reduce((a,b)=>a+(b-mean)**2,0) / lengths.length;

  return clamp(1 - variance / 50);
}

function stopwordDensityScore(text) {
  const STOPWORDS = new Set([
    "the","is","at","which","on","and","a","an","to","of","in","for","with"
  ]);
  const words = text.toLowerCase().split(/\s+/);
  const count = words.filter(w => STOPWORDS.has(w)).length;
  return clamp((count / words.length) * 2);
}

function listDensityScore(text) {
  const bullets = (text.match(/[-•]/g) || []).length;
  return clamp(bullets / 5);
}

function hedgingScore(text) {
  const HEDGING_PHRASES = [
    "it is important to note",
    "in conclusion",
    "generally speaking",
    "overall",
    "as mentioned earlier"
  ];
  const lower = text.toLowerCase();
  const hits = HEDGING_PHRASES.filter(p => lower.includes(p)).length;
  return clamp(hits / 2);
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
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
 */
function scoreParagraphSync(text) {
  const scores = [
    { weight: 0.35, value: entropyScore(text) },
    { weight: 0.20, value: sentenceVarianceScore(text) },
    { weight: 0.15, value: stopwordDensityScore(text) },
    { weight: 0.15, value: listDensityScore(text) },
    { weight: 0.15, value: hedgingScore(text) }
  ];

  return scores.reduce((sum, s) => sum + s.weight * s.value, 0);
}
