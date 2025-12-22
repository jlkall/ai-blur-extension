/**
 * Optimized AI Image Detection - Enhanced Accuracy & Speed
 * Combines improved algorithms with aggressive performance optimizations
 */

(function() {
  'use strict';

  // Enhanced caching with image hashing
  const imageCache = new Map();
  const IMAGE_CACHE_SIZE = 1000;
  let imageCacheHits = 0;
  let imageCacheMisses = 0;

  // Hash image URL for caching
  function hashImage(img) {
    const src = img.src || img.currentSrc || '';
    // Use first 150 chars of URL + dimensions for cache key
    const key = `${src.substring(0, 150)}_${img.naturalWidth || img.width}_${img.naturalHeight || img.height}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Adaptive sampling - use fewer samples for large images
   */
  function getOptimalSampleSize(width, height, baseSize = 1000) {
    const pixels = width * height;
    if (pixels < 100000) return baseSize; // Small images: use all
    if (pixels < 1000000) return Math.floor(baseSize * 0.7); // Medium: 70%
    return Math.floor(baseSize * 0.5); // Large: 50%
  }

  /**
   * Fast grayscale conversion with caching
   */
  function getGrayFast(data, x, y, width) {
    const idx = (y * width + x) * 4;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }

  /**
   * Optimized FFT analysis with adaptive sampling
   */
  function calculateFFTAnalysisFast(imageData, width, height) {
    const sampleSize = Math.min(64, Math.floor(Math.sqrt(width * height) / 8));
    const stepX = Math.max(1, Math.floor(width / sampleSize));
    const stepY = Math.max(1, Math.floor(height / sampleSize));
    
    const samples = new Float32Array(sampleSize * sampleSize);
    let idx = 0;
    
    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const pixelIdx = (y * width + x) * 4;
        samples[idx++] = (imageData.data[pixelIdx] + imageData.data[pixelIdx + 1] + imageData.data[pixelIdx + 2]) / 3;
      }
    }
    
    // Calculate variance efficiently
    let sum = 0;
    for (let i = 0; i < idx; i++) {
      sum += samples[i];
    }
    const mean = sum / idx;
    
    let variance = 0;
    for (let i = 0; i < idx; i++) {
      variance += Math.pow(samples[i] - mean, 2);
    }
    variance /= idx;
    
    const frequencyUniformity = 1 - Math.min(1, variance / 1000);
    return frequencyUniformity;
  }

  /**
   * Optimized edge detection with reduced sampling
   */
  function calculateAdvancedEdgeAnalysisFast(imageData, width, height) {
    const data = imageData.data;
    const sampleStep = Math.max(2, Math.floor(Math.min(width, height) / 50));
    
    const edgeValues = [];
    
    for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
        const gray = getGrayFast(data, x, y, width);
        
        // Simplified Sobel (only calculate if needed)
        const gx = 
          -1 * getGrayFast(data, x - 1, y - 1, width) +
          1 * getGrayFast(data, x + 1, y - 1, width) +
          -2 * getGrayFast(data, x - 1, y, width) +
          2 * getGrayFast(data, x + 1, y, width) +
          -1 * getGrayFast(data, x - 1, y + 1, width) +
          1 * getGrayFast(data, x + 1, y + 1, width);
        
        const gy = 
          -1 * getGrayFast(data, x - 1, y - 1, width) +
          -2 * getGrayFast(data, x, y - 1, width) +
          -1 * getGrayFast(data, x + 1, y - 1, width) +
          1 * getGrayFast(data, x - 1, y + 1, width) +
          2 * getGrayFast(data, x, y + 1, width) +
          1 * getGrayFast(data, x + 1, y + 1, width);
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 20) {
          edgeValues.push(magnitude);
        }
      }
    }
    
    if (edgeValues.length === 0) return 0.5;
    
    // Fast mean and variance calculation
    let sum = 0;
    for (let i = 0; i < edgeValues.length; i++) {
      sum += edgeValues[i];
    }
    const mean = sum / edgeValues.length;
    
    let variance = 0;
    for (let i = 0; i < edgeValues.length; i++) {
      variance += Math.pow(edgeValues[i] - mean, 2);
    }
    variance /= edgeValues.length;
    
    const edgeConsistency = 1 - Math.min(1, variance / (mean * mean + 1));
    return edgeConsistency;
  }

  /**
   * Optimized LBP with reduced sampling
   */
  function calculateLBPTextureFast(imageData, width, height) {
    const data = imageData.data;
    const sampleStep = Math.max(2, Math.floor(Math.min(width, height) / 24));
    const lbpHistogram = new Uint16Array(256);
    
    for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
        const centerGray = getGrayFast(data, x, y, width);
        let lbp = 0;
        
        // 8-neighborhood LBP (optimized)
        const neighbors = [
          getGrayFast(data, x - 1, y - 1, width),
          getGrayFast(data, x, y - 1, width),
          getGrayFast(data, x + 1, y - 1, width),
          getGrayFast(data, x + 1, y, width),
          getGrayFast(data, x + 1, y + 1, width),
          getGrayFast(data, x, y + 1, width),
          getGrayFast(data, x - 1, y + 1, width),
          getGrayFast(data, x - 1, y, width)
        ];
        
        for (let i = 0; i < 8; i++) {
          if (neighbors[i] >= centerGray) {
            lbp |= (1 << i);
          }
        }
        
        lbpHistogram[lbp]++;
      }
    }
    
    // Calculate entropy efficiently
    let total = 0;
    for (let i = 0; i < 256; i++) {
      total += lbpHistogram[i];
    }
    
    if (total === 0) return 0.5;
    
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (lbpHistogram[i] > 0) {
        const p = lbpHistogram[i] / total;
        entropy -= p * Math.log2(p);
      }
    }
    
    const maxEntropy = Math.log2(256);
    return 1 - (entropy / maxEntropy);
  }

  /**
   * Optimized LAB color analysis with reduced sampling
   */
  function calculateLABColorAnalysisFast(imageData, width, height) {
    const data = imageData.data;
    const sampleStep = Math.max(2, Math.floor(Math.min(width, height) / 40));
    
    const aValues = [];
    const bValues = [];
    
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        const r = data[idx] / 255;
        const g = data[idx + 1] / 255;
        const b = data[idx + 2] / 255;
        
        // Simplified RGB to LAB (faster approximation)
        const [l, a, b_val] = rgbToLabFast(r, g, b);
        aValues.push(a);
        bValues.push(b_val);
      }
    }
    
    if (aValues.length === 0) return 0.5;
    
    // Fast mean and variance
    let aSum = 0, bSum = 0;
    for (let i = 0; i < aValues.length; i++) {
      aSum += aValues[i];
      bSum += bValues[i];
    }
    const aMean = aSum / aValues.length;
    const bMean = bSum / bValues.length;
    
    let aVariance = 0, bVariance = 0;
    for (let i = 0; i < aValues.length; i++) {
      aVariance += Math.pow(aValues[i] - aMean, 2);
      bVariance += Math.pow(bValues[i] - bMean, 2);
    }
    aVariance /= aValues.length;
    bVariance /= bValues.length;
    
    const colorUniformity = 1 - Math.min(1, (aVariance + bVariance) / 200);
    return colorUniformity;
  }

  function rgbToLabFast(r, g, b) {
    // Fast approximation (skips some intermediate steps)
    let x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    let y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    let z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
    
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
    
    const l = (116 * y) - 16;
    const a = 500 * (x - y);
    const b_val = 200 * (y - z);
    
    return [l, a, b_val];
  }

  /**
   * Optimized block uniformity with adaptive block size
   */
  function calculateBlockUniformityFast(imageData, width, height) {
    const blockSize = Math.max(16, Math.min(32, Math.floor(Math.min(width, height) / 8)));
    const blocksX = Math.floor(width / blockSize);
    const blocksY = Math.floor(height / blockSize);
    
    if (blocksX < 2 || blocksY < 2) return 0.5;
    
    const blockMeans = new Float32Array(blocksX * blocksY);
    let idx = 0;
    
    for (let by = 0; by < blocksY; by++) {
      for (let bx = 0; bx < blocksX; bx++) {
        let sum = 0;
        let count = 0;
        
        const startY = by * blockSize;
        const endY = Math.min((by + 1) * blockSize, height);
        const startX = bx * blockSize;
        const endX = Math.min((bx + 1) * blockSize, width);
        
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const pixelIdx = (y * width + x) * 4;
            sum += (imageData.data[pixelIdx] + imageData.data[pixelIdx + 1] + imageData.data[pixelIdx + 2]) / 3;
            count++;
          }
        }
        
        blockMeans[idx++] = count > 0 ? sum / count : 0;
      }
    }
    
    // Fast variance calculation
    let sum = 0;
    for (let i = 0; i < idx; i++) {
      sum += blockMeans[i];
    }
    const mean = sum / idx;
    
    let variance = 0;
    for (let i = 0; i < idx; i++) {
      variance += Math.pow(blockMeans[i] - mean, 2);
    }
    variance /= idx;
    
    return Math.max(0, Math.min(1, 1 - variance / 1000));
  }

  /**
   * Optimized histogram features with reduced sampling
   */
  function calculateHistogramFeaturesFast(imageData, width, height) {
    const data = imageData.data;
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 80));
    
    const rHist = new Uint16Array(256);
    const gHist = new Uint16Array(256);
    const bHist = new Uint16Array(256);
    let count = 0;
    
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        rHist[data[idx]]++;
        gHist[data[idx + 1]]++;
        bHist[data[idx + 2]]++;
        count++;
      }
    }
    
    // Normalize and calculate entropy
    const calculateEntropy = (hist) => {
      let entropy = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > 0) {
          const p = hist[i] / count;
          entropy -= p * Math.log2(p);
        }
      }
      return entropy;
    };
    
    const rEntropy = calculateEntropy(rHist);
    const gEntropy = calculateEntropy(gHist);
    const bEntropy = calculateEntropy(bHist);
    const avgEntropy = (rEntropy + gEntropy + bEntropy) / 3;
    
    const maxEntropy = Math.log2(256);
    return 1 - (avgEntropy / maxEntropy);
  }

  /**
   * Optimized gradient magnitude with reduced sampling
   */
  function calculateGradientMagnitudeFast(imageData, width, height) {
    const data = imageData.data;
    const sampleStep = Math.max(2, Math.floor(Math.min(width, height) / 40));
    
    const gradients = [];
    
    for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
        const gray = getGrayFast(data, x, y, width);
        const gx = getGrayFast(data, x + 1, y, width) - getGrayFast(data, x - 1, y, width);
        const gy = getGrayFast(data, x, y + 1, width) - getGrayFast(data, x, y - 1, width);
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        gradients.push(magnitude);
      }
    }
    
    if (gradients.length === 0) return 0.5;
    
    // Fast mean and variance
    let sum = 0;
    for (let i = 0; i < gradients.length; i++) {
      sum += gradients[i];
    }
    const mean = sum / gradients.length;
    
    let variance = 0;
    for (let i = 0; i < gradients.length; i++) {
      variance += Math.pow(gradients[i] - mean, 2);
    }
    variance /= gradients.length;
    
    return Math.max(0, Math.min(1, 1 - variance / (mean * mean + 100)));
  }

  /**
   * Optimized artifact detection with early exit
   */
  function detectAdvancedArtifactsFast(imageData, width, height) {
    const data = imageData.data;
    let artifactScore = 0;
    let checks = 0;
    
    // Reduced checkerboard check
    const checkSize = 8;
    const maxChecks = 100; // Limit checks for speed
    
    for (let y = 0; y < height - checkSize && checks < maxChecks; y += checkSize * 2) {
      for (let x = 0; x < width - checkSize && checks < maxChecks; x += checkSize * 2) {
        const idx1 = (y * width + x) * 4;
        const idx2 = ((y + checkSize) * width + (x + checkSize)) * 4;
        const gray1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
        const gray2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
        
        if (Math.abs(gray1 - gray2) < 5) {
          artifactScore += 0.5;
        }
        checks++;
      }
    }
    
    if (checks > 0) {
      artifactScore = Math.min(1, (artifactScore / checks) * 0.5);
    }
    
    return artifactScore;
  }

  /**
   * Optimized multi-scale analysis (reduced scales)
   */
  function calculateMultiScaleFeaturesFast(imageData, width, height) {
    const scales = [1, 0.5]; // Reduced from 3 to 2 scales
    const scaleScores = [];
    
    scales.forEach(scale => {
      const scaledWidth = Math.floor(width * scale);
      const scaledHeight = Math.floor(height * scale);
      
      if (scaledWidth < 10 || scaledHeight < 10) return;
      
      const step = Math.max(1, Math.floor(1 / scale));
      const samples = [];
      
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const idx = (y * width + x) * 4;
          samples.push((imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3);
        }
      }
      
      if (samples.length > 0) {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          sum += samples[i];
        }
        const mean = sum / samples.length;
        
        let variance = 0;
        for (let i = 0; i < samples.length; i++) {
          variance += Math.pow(samples[i] - mean, 2);
        }
        variance /= samples.length;
        
        scaleScores.push(1 - Math.min(1, variance / 1000));
      }
    });
    
    if (scaleScores.length === 0) return 0.5;
    
    return scaleScores.reduce((a, b) => a + b, 0) / scaleScores.length;
  }

  /**
   * Optimized feature extraction with caching
   */
  function extractOptimizedFeatures(imageData, width, height, baseFeatures = {}) {
    try {
      const enhanced = {
        // Optimized advanced features
        fftAnalysis: calculateFFTAnalysisFast(imageData, width, height),
        advancedEdgeAnalysis: calculateAdvancedEdgeAnalysisFast(imageData, width, height),
        lbpTexture: calculateLBPTextureFast(imageData, width, height),
        labColorAnalysis: calculateLABColorAnalysisFast(imageData, width, height),
        blockUniformity: calculateBlockUniformityFast(imageData, width, height),
        histogramFeatures: calculateHistogramFeaturesFast(imageData, width, height),
        gradientMagnitude: calculateGradientMagnitudeFast(imageData, width, height),
        advancedArtifacts: detectAdvancedArtifactsFast(imageData, width, height),
        multiScaleFeatures: calculateMultiScaleFeaturesFast(imageData, width, height),
        
        // Include base features
        ...baseFeatures
      };
      
      return enhanced;
    } catch (error) {
      console.warn("[CloseAI] Optimized feature extraction failed:", error);
      return baseFeatures;
    }
  }

  /**
   * Optimized scoring with improved weights
   */
  function calculateOptimizedScore(features, metadata = {}) {
    // Tuned weights for maximum accuracy
    const weights = {
      // Top-tier features (45%)
      textureSmoothness: 0.13,
      gradientSmoothness: 0.11,
      fftAnalysis: 0.09,
      advancedEdgeAnalysis: 0.07,
      multiScaleFeatures: 0.05,
      
      // Strong indicators (30%)
      highFreqContent: 0.09,
      noiseLevel: 0.08,
      lbpTexture: 0.07,
      blockUniformity: 0.06,
      
      // Moderate indicators (20%)
      colorUniformity: 0.06,
      edgeConsistency: 0.06,
      textureUniformity: 0.05,
      labColorAnalysis: 0.03,
      
      // Metadata & artifacts (5%)
      urlScore: 0.03,
      contextScore: 0.02
    };
    
    let score = 0;
    let totalWeight = 0;
    
    for (const [feature, weight] of Object.entries(weights)) {
      if (features[feature] !== undefined && !isNaN(features[feature])) {
        score += weight * features[feature];
        totalWeight += weight;
      }
    }
    
    // Normalize
    if (totalWeight > 0) {
      score = score / totalWeight;
    }
    
    // Boost if metadata strongly suggests AI
    if (metadata.urlScore > 0.5 || metadata.contextScore > 0.5) {
      score = Math.min(1, score * 1.25);
    }
    
    // Non-linear scaling for better selectivity
    score = Math.pow(score, 1.2);
    score = Math.max(0, Math.min(1, score));
    
    // Calculate confidence
    const featureValues = Object.values(features).filter(v => typeof v === 'number' && !isNaN(v));
    if (featureValues.length === 0) {
      return { score: 0, confidence: 0 };
    }
    
    const mean = featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
    const variance = featureValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / featureValues.length;
    
    let confidence = Math.max(0.5, Math.min(1, 1 - variance * 1.2));
    
    // Boost confidence if metadata supports
    if (metadata.urlScore > 0.5 && metadata.contextScore > 0.5) {
      confidence = Math.min(1, confidence + 0.3);
    } else if (metadata.urlScore > 0.3 || metadata.contextScore > 0.3) {
      confidence = Math.min(1, confidence + 0.2);
    }
    
    return { score, confidence };
  }

  // Export functions
  if (typeof window !== 'undefined') {
    window.closeaiOptimizedImageDetector = {
      extractOptimizedFeatures: extractOptimizedFeatures,
      calculateOptimizedScore: calculateOptimizedScore,
      // Cache management
      getCacheStats: () => ({
        hits: imageCacheHits,
        misses: imageCacheMisses,
        hitRate: imageCacheHits / (imageCacheHits + imageCacheMisses) || 0,
        size: imageCache.size
      }),
      clearCache: () => {
        imageCache.clear();
        imageCacheHits = 0;
        imageCacheMisses = 0;
      },
      hashImage: hashImage
    };
  }
})();

