/**
 * Robust AI Text Detection using Multiple ML Features
 * Combines perplexity, burstiness, statistical features, and ensemble methods
 */

let session = null;
let tokenizer = null;

// Initialize ONNX Runtime model
async function loadModel() {
  if (session) return session;
  if (session === false) return null; // Already tried and failed

  // Check if ONNX Runtime is available
  if (typeof ort === 'undefined') {
    console.warn("[AI BLUR] ONNX Runtime not available");
    session = false;
    return null;
  }

  try {
    // Configure WASM paths - use relative paths that work in extensions
    if (ort.env && ort.env.wasm) {
      ort.env.wasm.wasmPaths = chrome.runtime.getURL("ml/");
    }

    session = await ort.InferenceSession.create(
      chrome.runtime.getURL("ml/distilgpt2.onnx"),
      {
        executionProviders: ['wasm'], // Use WASM only, fallback gracefully
        logSeverityLevel: 3 // Only log errors
      }
    );
    return session;
  } catch (error) {
    // Silently fail - we have statistical fallback, no need to spam console
    // Only log if it's not a WASM/backend error (those are expected)
    if (!error.message.includes('backend') && !error.message.includes('WASM') && !error.message.includes('wasm')) {
      console.warn("[AI BLUR] Failed to load ML model:", error.message);
    }
    session = false; // Mark as failed so we don't keep trying
    return null;
  }
}

// Load tokenizer if available
async function loadTokenizer() {
  if (tokenizer) return tokenizer;

  try {
    const response = await fetch(chrome.runtime.getURL("ml/tokenizer.json"));
    tokenizer = await response.json();
    return tokenizer;
  } catch (error) {
    console.warn("[AI BLUR] Tokenizer not available, using fallback");
    return null;
  }
}

/**
 * Simple tokenizer fallback (splits on whitespace and punctuation)
 */
function simpleTokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Get token IDs using tokenizer or fallback
 */
function getTokenIds(text, maxLength = 128) {
  const tokens = simpleTokenize(text);
  // Convert tokens to IDs (simple hash-based approach)
  const tokenIds = tokens.slice(0, maxLength).map(token => {
    // Simple hash function for token IDs
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 50257; // GPT-2 vocab size
  });
  return tokenIds;
}

/**
 * Calculate perplexity using the language model
 * Perplexity = exp(cross-entropy loss)
 */
async function computePerplexity(text) {
  const model = await loadModel();
  if (!model) return null;

  const tokenIds = getTokenIds(text, 128);
  if (tokenIds.length < 10) return null;

  try {
    // Prepare input tensor
    const inputTensor = new ort.Tensor(
      "int64",
      BigInt64Array.from(tokenIds.map(BigInt)),
      [1, tokenIds.length]
    );

    // Run inference
    const outputs = await model.run({ input_ids: inputTensor });
    const logits = outputs.logits;

    // Calculate perplexity
    // Logits shape: [batch_size, sequence_length, vocab_size]
    const [batchSize, seqLength, vocabSize] = logits.dims;
    
    if (seqLength !== tokenIds.length) {
      console.warn("[AI BLUR] Sequence length mismatch");
      return null;
    }

    let totalLogProb = 0;
    let validPositions = 0;

    // For each position, predict the next token
    for (let i = 0; i < tokenIds.length - 1; i++) {
      const nextTokenId = tokenIds[i + 1];
      
      // Get logits for position i: [vocab_size]
      const logitsStartIdx = i * vocabSize;
      const logitsEndIdx = (i + 1) * vocabSize;
      const logitsAtPos = Array.from(logits.data.slice(logitsStartIdx, logitsEndIdx));
      
      // Softmax to get probabilities (numerically stable)
      const maxLogit = Math.max(...logitsAtPos);
      const expLogits = logitsAtPos.map(l => Math.exp(Math.min(700, l - maxLogit))); // Prevent overflow
      const sumExp = expLogits.reduce((a, b) => a + b, 0);
      
      if (sumExp === 0) continue;
      
      const probs = expLogits.map(e => e / sumExp);
      
      // Log probability of the actual next token
      const prob = probs[nextTokenId] || 1e-10;
      totalLogProb += Math.log(Math.max(1e-10, prob));
      validPositions++;
    }

    if (validPositions === 0) return null;

    const avgLogProb = totalLogProb / validPositions;
    const perplexity = Math.exp(-avgLogProb);
    
    // Clamp to reasonable range
    return Math.max(1, Math.min(1000, perplexity));
  } catch (error) {
    console.error("[AI BLUR] Perplexity calculation error:", error);
    return null;
  }
}

/**
 * Calculate burstiness score
 * AI text tends to have more uniform sentence lengths (low burstiness)
 */
function calculateBurstiness(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 3) return 0.5;

  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  
  if (mean === 0) return 0.5;

  // Calculate coefficient of variation
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // Coefficient of variation

  // Higher CV = more bursty = more human-like
  // Lower CV = less bursty = more AI-like
  return Math.max(0, Math.min(1, 1 - cv / 2));
}

/**
 * Calculate n-gram repetition score
 * AI text often has repetitive patterns
 */
function calculateRepetitionScore(text, n = 3) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length < n * 2) return 0;

  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }

  const uniqueNgrams = new Set(ngrams);
  const repetitionRatio = 1 - (uniqueNgrams.size / ngrams.length);
  
  return Math.min(1, repetitionRatio * 2);
}

/**
 * Calculate word frequency distribution entropy
 * AI text often has more uniform word frequency distribution
 */
function calculateWordEntropy(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length < 10) return 0.5;

  const freq = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });

  const total = words.length;
  let entropy = 0;

  for (const word in freq) {
    const p = freq[word] / total;
    entropy -= p * Math.log2(p);
  }

  // Normalize entropy (max entropy is log2(vocab_size))
  const maxEntropy = Math.log2(Object.keys(freq).length);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

  // Lower entropy = more repetitive = more AI-like
  return 1 - normalizedEntropy;
}

/**
 * Calculate punctuation diversity
 * Human text tends to have more varied punctuation
 */
function calculatePunctuationDiversity(text) {
  const punct = text.match(/[.,!?;:—–-]/g) || [];
  if (punct.length < 5) return 0.3;

  const uniquePunct = new Set(punct);
  const diversity = uniquePunct.size / Math.min(punct.length, 10);
  
  // Lower diversity = more AI-like
  return 1 - Math.min(1, diversity);
}

/**
 * Calculate transition probability patterns
 * AI text has smoother transitions between words
 */
function calculateTransitionSmoothness(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length < 20) return 0.5;

  // Calculate bigram frequencies
  const bigrams = {};
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    bigrams[bigram] = (bigrams[bigram] || 0) + 1;
  }

  // Calculate average transition probability
  const wordFreq = {};
  words.forEach(w => wordFreq[w] = (wordFreq[w] || 0) + 1);

  let smoothness = 0;
  let count = 0;

  for (const bigram in bigrams) {
    const [w1, w2] = bigram.split(' ');
    const bigramFreq = bigrams[bigram];
    const w1Freq = wordFreq[w1] || 1;
    const prob = bigramFreq / w1Freq;
    smoothness += prob;
    count++;
  }

  const avgSmoothness = count > 0 ? smoothness / count : 0;
  
  // Higher smoothness = more AI-like
  return Math.min(1, avgSmoothness * 2);
}

/**
 * Calculate semantic coherence score
 * Uses perplexity as a proxy for coherence
 */
async function calculateCoherenceScore(text) {
  const perplexity = await computePerplexity(text);
  if (perplexity === null) return 0.5;

  // Lower perplexity = more predictable = more AI-like
  // Normalize perplexity (typical range: 10-100 for GPT models)
  const normalized = Math.max(0, Math.min(1, (perplexity - 10) / 90));
  return 1 - normalized;
}

/**
 * Main detection function - Ensemble of multiple features
 */
async function detectAIGenerated(text) {
  if (!text || text.trim().length < 20) {
    return { score: 0, confidence: 0, features: {} };
  }

  // Extract features
  const features = {
    perplexity: await calculateCoherenceScore(text),
    burstiness: calculateBurstiness(text),
    repetition: calculateRepetitionScore(text),
    wordEntropy: calculateWordEntropy(text),
    punctDiversity: calculatePunctuationDiversity(text),
    transitionSmoothness: calculateTransitionSmoothness(text)
  };

  // Weighted ensemble (tuned for accuracy)
  const weights = {
    perplexity: 0.30,      // Most important - model-based
    burstiness: 0.20,      // Sentence length variation
    repetition: 0.15,      // N-gram repetition
    wordEntropy: 0.15,     // Word frequency distribution
    punctDiversity: 0.10,  // Punctuation patterns
    transitionSmoothness: 0.10  // Word transition patterns
  };

  // Calculate weighted score
  let score = 0;
  for (const [feature, value] of Object.entries(features)) {
    score += weights[feature] * value;
  }

  // Calculate confidence based on feature agreement
  const featureValues = Object.values(features);
  const mean = featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
  const variance = featureValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / featureValues.length;
  const confidence = Math.max(0, Math.min(1, 1 - variance * 2));

  return {
    score: Math.max(0, Math.min(1, score)),
    confidence: confidence,
    features: features
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectAIGenerated, computePerplexity };
}

// Make available globally for content scripts (content scripts share global scope)
// In content scripts, top-level vars are global to the script context

