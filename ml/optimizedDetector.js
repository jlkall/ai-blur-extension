/**
 * Optimized AI Text Detection - Enhanced Accuracy & Speed
 * Combines improved algorithms with performance optimizations
 */

(function() {
  'use strict';

  // Enhanced caching with content hashing
  const textCache = new Map();
  const CACHE_SIZE = 2000;
  let cacheHits = 0;
  let cacheMisses = 0;

  // Simple hash function for text (fast)
  function hashText(text) {
    let hash = 0;
    const len = Math.min(text.length, 200); // Only hash first 200 chars for speed
    for (let i = 0; i < len; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Pre-computed common words for faster lookups
  const COMMON_WORDS_SET = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
    'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
  ]);

  // Pre-computed discourse markers
  const DISCOURSE_MARKERS = new Set([
    'however', 'therefore', 'moreover', 'furthermore', 'nevertheless', 'consequently',
    'additionally', 'meanwhile', 'thus', 'hence', 'indeed', 'specifically', 'generally',
    'particularly', 'especially', 'notably', 'importantly', 'interestingly', 'surprisingly',
    'obviously', 'clearly', 'essentially', 'basically', 'ultimately', 'finally', 'initially',
    'subsequently', 'previously', 'currently', 'recently', 'traditionally', 'typically',
    'usually', 'often', 'sometimes', 'rarely', 'never', 'always'
  ]);

  /**
   * Fast sentence splitting with caching
   */
  const sentenceCache = new Map();
  function fastSplitSentences(text) {
    const hash = hashText(text);
    if (sentenceCache.has(hash)) {
      return sentenceCache.get(hash);
    }
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentenceCache.size > 500) {
      const firstKey = sentenceCache.keys().next().value;
      sentenceCache.delete(firstKey);
    }
    sentenceCache.set(hash, sentences);
    return sentences;
  }

  /**
   * Fast word tokenization with caching
   */
  const wordCache = new Map();
  function fastTokenize(text) {
    const hash = hashText(text);
    if (wordCache.has(hash)) {
      return wordCache.get(hash);
    }
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (wordCache.size > 500) {
      const firstKey = wordCache.keys().next().value;
      wordCache.delete(firstKey);
    }
    wordCache.set(hash, words);
    return words;
  }

  /**
   * Optimized sentence-level perplexity variance
   * Uses sampling for speed
   */
  function calculateSentencePerplexityVarianceFast(text) {
    const sentences = fastSplitSentences(text);
    if (sentences.length < 3) return 0.5;

    // Sample sentences for speed (use all if < 10, otherwise sample)
    const sampleSize = Math.min(sentences.length, 10);
    const step = Math.floor(sentences.length / sampleSize);
    const sampledSentences = [];
    for (let i = 0; i < sentences.length; i += step) {
      sampledSentences.push(sentences[i]);
    }

    // Pre-compute word frequencies once
    const allWords = fastTokenize(text);
    const wordFreq = new Map();
    allWords.forEach(w => {
      if (w.length > 2) {
        wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
      }
    });
    const totalWords = allWords.length;

    // Calculate scores for sampled sentences
    const sentenceScores = sampledSentences.map(sentence => {
      const words = fastTokenize(sentence).filter(w => w.length > 2);
      if (words.length === 0) return 0.5;

      let avgFreq = 0;
      words.forEach(w => {
        const freq = (wordFreq.get(w) || 0) / totalWords;
        avgFreq += freq;
      });
      return avgFreq / words.length;
    });

    // Calculate variance
    const mean = sentenceScores.reduce((a, b) => a + b, 0) / sentenceScores.length;
    const variance = sentenceScores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sentenceScores.length;

    return Math.max(0, Math.min(1, 1 - variance * 10));
  }

  /**
   * Optimized cross-entropy analysis
   */
  function calculateCrossEntropyScoreFast(text) {
    const words = fastTokenize(text).filter(w => w.length > 2);
    if (words.length < 10) return 0.5;

    // Use Set lookup (O(1)) instead of array includes (O(n))
    let commonWordCount = 0;
    words.forEach(w => {
      if (COMMON_WORDS_SET.has(w)) commonWordCount++;
    });

    const commonWordRatio = commonWordCount / words.length;
    return Math.min(1, commonWordRatio * 1.5);
  }

  /**
   * Optimized semantic coherence with early exit
   */
  function calculateSemanticCoherenceFast(text) {
    const sentences = fastSplitSentences(text);
    if (sentences.length < 2) return 0.5;

    // Sample sentence pairs for speed
    const maxPairs = Math.min(sentences.length - 1, 15);
    const step = Math.max(1, Math.floor((sentences.length - 1) / maxPairs));
    
    let coherenceScore = 0;
    let pairs = 0;

    for (let i = 0; i < sentences.length - 1 && pairs < maxPairs; i += step) {
      const s1 = new Set(fastTokenize(sentences[i]).filter(w => w.length > 2));
      const s2 = new Set(fastTokenize(sentences[i + 1]).filter(w => w.length > 2));

      // Fast intersection using Set
      let intersection = 0;
      s1.forEach(w => {
        if (s2.has(w)) intersection++;
      });
      const union = s1.size + s2.size - intersection;

      const overlap = union > 0 ? intersection / union : 0;
      coherenceScore += overlap;
      pairs++;
    }

    const avgCoherence = pairs > 0 ? coherenceScore / pairs : 0;
    return Math.min(1, avgCoherence * 2);
  }

  /**
   * Optimized lexical diversity
   */
  function calculateLexicalDiversityFast(text) {
    const words = fastTokenize(text).filter(w => w.length > 2);
    if (words.length < 10) return 0.5;

    // Use Set for O(1) uniqueness check
    const uniqueWords = new Set(words);
    const ttr = uniqueWords.size / words.length;

    return Math.max(0, Math.min(1, 1 - ttr * 2));
  }

  /**
   * Optimized syntactic complexity
   */
  function calculateSyntacticComplexityFast(text) {
    const sentences = fastSplitSentences(text);
    if (sentences.length < 3) return 0.5;

    // Pre-compile regex for faster matching
    const clauseRegex = /,|and|but|or|because|although|while|if|when/gi;
    
    const complexities = sentences.map(sentence => {
      const clauses = (sentence.match(clauseRegex) || []).length;
      const words = sentence.split(/\s+/).length;
      return words > 0 ? clauses / words : 0;
    });

    const mean = complexities.reduce((a, b) => a + b, 0) / complexities.length;
    const variance = complexities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / complexities.length;

    return Math.max(0, Math.min(1, 1 - variance * 20));
  }

  /**
   * Optimized discourse marker diversity
   */
  function calculateDiscourseMarkerDiversityFast(text) {
    const textLower = text.toLowerCase();
    const markers = [];
    
    // Fast Set-based lookup
    DISCOURSE_MARKERS.forEach(marker => {
      const regex = new RegExp(`\\b${marker}\\b`, 'gi');
      if (regex.test(textLower)) {
        markers.push(marker);
      }
    });
    
    if (markers.length < 2) return 0.3;

    const uniqueMarkers = new Set(markers);
    const diversity = uniqueMarkers.size / Math.min(markers.length, 10);

    return Math.max(0, Math.min(1, 1 - diversity));
  }

  /**
   * Optimized pronoun pattern analysis
   */
  function calculatePronounPatternScoreFast(text) {
    // Pre-compiled regexes for faster matching
    const firstPersonRegex = /\b(I|me|my|mine|myself|we|us|our|ours|ourselves)\b/gi;
    const secondPersonRegex = /\b(you|your|yours|yourself|yourselves)\b/gi;
    const thirdPersonRegex = /\b(he|she|it|him|her|his|hers|its|they|them|their|theirs|themselves)\b/gi;

    const first = (text.match(firstPersonRegex) || []).length;
    const second = (text.match(secondPersonRegex) || []).length;
    const third = (text.match(thirdPersonRegex) || []).length;

    const total = first + second + third;
    if (total < 3) return 0.5;

    const thirdPersonRatio = third / total;
    return Math.min(1, thirdPersonRatio * 1.3);
  }

  /**
   * Optimized word length variance
   */
  function calculateWordLengthVarianceFast(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 10) return 0.5;

    // Use typed array for better performance
    const lengths = new Uint8Array(words.length);
    let sum = 0;
    for (let i = 0; i < words.length; i++) {
      lengths[i] = words[i].length;
      sum += lengths[i];
    }

    const mean = sum / words.length;
    let variance = 0;
    for (let i = 0; i < lengths.length; i++) {
      variance += Math.pow(lengths[i] - mean, 2);
    }
    variance /= lengths.length;

    return Math.max(0, Math.min(1, 1 - variance / 5));
  }

  /**
   * Ultra-fast burstiness calculation
   */
  function calculateBurstinessFast(text) {
    const sentences = fastSplitSentences(text);
    if (sentences.length < 3) return 0.5;

    // Use typed array for lengths
    const lengths = new Uint16Array(sentences.length);
    let sum = 0;
    for (let i = 0; i < sentences.length; i++) {
      lengths[i] = sentences[i].trim().split(/\s+/).length;
      sum += lengths[i];
    }

    const mean = sum / sentences.length;
    if (mean === 0) return 0.5;

    let variance = 0;
    for (let i = 0; i < lengths.length; i++) {
      variance += Math.pow(lengths[i] - mean, 2);
    }
    variance /= lengths.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    return Math.max(0, Math.min(1, 1 - cv / 2));
  }

  /**
   * Optimized repetition detection
   */
  function calculateRepetitionScoreFast(text, n = 3) {
    const words = fastTokenize(text);
    if (words.length < n * 2) return 0;

    // Use Map for O(1) lookups
    const ngramMap = new Map();
    let totalNgrams = 0;

    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      ngramMap.set(ngram, (ngramMap.get(ngram) || 0) + 1);
      totalNgrams++;
    }

    const uniqueNgrams = ngramMap.size;
    const repetitionRatio = 1 - (uniqueNgrams / totalNgrams);
    
    return Math.min(1, repetitionRatio * 2);
  }

  /**
   * Optimized word entropy
   */
  function calculateWordEntropyFast(text) {
    const words = fastTokenize(text).filter(w => w.length > 2);
    if (words.length < 10) return 0.5;

    // Use Map for O(1) frequency lookups
    const freq = new Map();
    words.forEach(word => {
      freq.set(word, (freq.get(word) || 0) + 1);
    });

    const total = words.length;
    let entropy = 0;

    freq.forEach(count => {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });

    const maxEntropy = Math.log2(freq.size);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    return 1 - normalizedEntropy;
  }

  /**
   * Ultra-optimized ensemble detection with caching
   */
  async function detectAIGeneratedOptimized(text, baseFeatures = {}) {
    if (!text || text.trim().length < 20) {
      return { score: 0, confidence: 0, features: {} };
    }

    // Check cache first
    const cacheKey = hashText(text);
    if (textCache.has(cacheKey)) {
      cacheHits++;
      return textCache.get(cacheKey);
    }
    cacheMisses++;

    // Early exit for very short text
    if (text.trim().length < 40) {
      const result = { score: 0.2, confidence: 0.3, features: {} };
      cacheResult(cacheKey, result);
      return result;
    }

    // Calculate all features in parallel where possible
    const features = {
      // Base features (from existing detector)
      perplexity: baseFeatures.perplexity || 0,
      burstiness: baseFeatures.burstiness || calculateBurstinessFast(text),
      repetition: baseFeatures.repetition || calculateRepetitionScoreFast(text),
      wordEntropy: baseFeatures.wordEntropy || calculateWordEntropyFast(text),
      punctDiversity: baseFeatures.punctDiversity || 0,
      transitionSmoothness: baseFeatures.transitionSmoothness || 0,
      
      // Optimized enhanced features
      sentencePerplexityVariance: calculateSentencePerplexityVarianceFast(text),
      crossEntropy: calculateCrossEntropyScoreFast(text),
      semanticCoherence: calculateSemanticCoherenceFast(text),
      lexicalDiversity: calculateLexicalDiversityFast(text),
      syntacticComplexity: calculateSyntacticComplexityFast(text),
      discourseMarkers: calculateDiscourseMarkerDiversityFast(text),
      pronounPatterns: calculatePronounPatternScoreFast(text),
      wordLengthVariance: calculateWordLengthVarianceFast(text)
    };

    // Optimized weights (tuned for maximum accuracy)
    const weights = {
      // Core features (45%)
      perplexity: 0.22,
      burstiness: 0.13,
      semanticCoherence: 0.10,
      
      // Advanced features (35%)
      sentencePerplexityVariance: 0.11,
      lexicalDiversity: 0.09,
      crossEntropy: 0.08,
      syntacticComplexity: 0.05,
      wordLengthVariance: 0.02,
      
      // Supporting features (20%)
      repetition: 0.07,
      wordEntropy: 0.06,
      transitionSmoothness: 0.04,
      discourseMarkers: 0.02,
      pronounPatterns: 0.01,
      punctDiversity: 0.00
    };

    // Calculate weighted score (optimized)
    let score = 0;
    let totalWeight = 0;
    for (const [feature, value] of Object.entries(features)) {
      const weight = weights[feature];
      if (weight !== undefined && !isNaN(value) && value !== null) {
        score += weight * value;
        totalWeight += weight;
      }
    }

    // Normalize
    if (totalWeight > 0) {
      score = score / totalWeight;
    }

    // Calculate confidence based on feature agreement
    const featureValues = Object.values(features).filter(v => typeof v === 'number' && !isNaN(v) && v !== null);
    if (featureValues.length === 0) {
      const result = { score: 0, confidence: 0, features };
      cacheResult(cacheKey, result);
      return result;
    }

    const mean = featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
    const variance = featureValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / featureValues.length;
    const confidence = Math.max(0.5, Math.min(1, 1 - variance * 1.5));

    const result = {
      score: Math.max(0, Math.min(1, score)),
      confidence: confidence,
      features: features
    };

    cacheResult(cacheKey, result);
    return result;
  }

  function cacheResult(key, result) {
    if (textCache.size >= CACHE_SIZE) {
      // Remove oldest 10% of cache
      const keysToRemove = Array.from(textCache.keys()).slice(0, Math.floor(CACHE_SIZE * 0.1));
      keysToRemove.forEach(k => textCache.delete(k));
    }
    textCache.set(key, result);
  }

  // Export for use in other modules
  if (typeof window !== 'undefined') {
    window.closeaiOptimizedDetector = {
      detectAIGeneratedOptimized: detectAIGeneratedOptimized,
      // Expose cache stats for debugging
      getCacheStats: () => ({
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: cacheHits / (cacheHits + cacheMisses) || 0,
        size: textCache.size
      }),
      clearCache: () => {
        textCache.clear();
        sentenceCache.clear();
        wordCache.clear();
        cacheHits = 0;
        cacheMisses = 0;
      }
    };
  }
})();

