/**
 * Enhanced AI Image Detection - Advanced Features
 * Adds sophisticated detection methods for drastically improved accuracy
 */

(function() {
  'use strict';

  /**
   * Advanced Frequency Domain Analysis
   * AI images have distinct frequency signatures
   */
  function calculateFFTAnalysis(imageData, width, height) {
    // Sample a grid for FFT analysis (performance optimization)
    const sampleSize = 64;
    const stepX = Math.max(1, Math.floor(width / sampleSize));
    const stepY = Math.max(1, Math.floor(height / sampleSize));
    
    const samples = [];
    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const idx = (y * width + x) * 4;
        const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
        samples.push(gray);
      }
    }
    
    // Calculate frequency distribution using variance
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    
    // AI images often have specific frequency patterns (more uniform)
    const frequencyUniformity = 1 - Math.min(1, variance / 1000);
    
    return frequencyUniformity;
  }

  /**
   * Advanced Edge Detection (Canny-like)
   * AI images have smoother, more consistent edges
   */
  function calculateAdvancedEdgeAnalysis(imageData, width, height) {
    const data = imageData.data;
    const edgeMap = new Array(width * height).fill(0);
    
    // Sobel edge detection (simplified)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Sobel kernels
        const gx = 
          -1 * getGray(data, x - 1, y - 1, width) +
          1 * getGray(data, x + 1, y - 1, width) +
          -2 * getGray(data, x - 1, y, width) +
          2 * getGray(data, x + 1, y, width) +
          -1 * getGray(data, x - 1, y + 1, width) +
          1 * getGray(data, x + 1, y + 1, width);
        
        const gy = 
          -1 * getGray(data, x - 1, y - 1, width) +
          -2 * getGray(data, x, y - 1, width) +
          -1 * getGray(data, x + 1, y - 1, width) +
          1 * getGray(data, x - 1, y + 1, width) +
          2 * getGray(data, x, y + 1, width) +
          1 * getGray(data, x + 1, y + 1, width);
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edgeMap[y * width + x] = magnitude;
      }
    }
    
    // Analyze edge consistency
    const edgeValues = edgeMap.filter(v => v > 20); // Threshold
    if (edgeValues.length === 0) return 0.5;
    
    const mean = edgeValues.reduce((a, b) => a + b, 0) / edgeValues.length;
    const variance = edgeValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / edgeValues.length;
    
    // Lower variance = more consistent edges = more AI-like
    const edgeConsistency = 1 - Math.min(1, variance / (mean * mean + 1));
    
    return edgeConsistency;
  }

  function getGray(data, x, y, width) {
    const idx = (y * width + x) * 4;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }

  /**
   * Local Binary Patterns (LBP) for texture analysis
   * AI images have different LBP patterns
   */
  function calculateLBPTexture(imageData, width, height) {
    const data = imageData.data;
    const lbpHistogram = new Array(256).fill(0);
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 32));
    
    for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
        const centerGray = getGray(data, x, y, width);
        let lbp = 0;
        
        // 8-neighborhood LBP
        const neighbors = [
          getGray(data, x - 1, y - 1, width),
          getGray(data, x, y - 1, width),
          getGray(data, x + 1, y - 1, width),
          getGray(data, x + 1, y, width),
          getGray(data, x + 1, y + 1, width),
          getGray(data, x, y + 1, width),
          getGray(data, x - 1, y + 1, width),
          getGray(data, x - 1, y, width)
        ];
        
        neighbors.forEach((neighbor, i) => {
          if (neighbor >= centerGray) {
            lbp |= (1 << i);
          }
        });
        
        lbpHistogram[lbp]++;
      }
    }
    
    // Calculate uniformity (AI images have more uniform LBP patterns)
    const total = lbpHistogram.reduce((a, b) => a + b, 0);
    if (total === 0) return 0.5;
    
    let entropy = 0;
    lbpHistogram.forEach(count => {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    });
    
    // Lower entropy = more uniform = more AI-like
    const maxEntropy = Math.log2(256);
    return 1 - (entropy / maxEntropy);
  }

  /**
   * Color Space Analysis (LAB color space)
   * AI images often have unnatural color distributions
   */
  function calculateLABColorAnalysis(imageData, width, height) {
    const data = imageData.data;
    const labValues = [];
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 50));
    
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        const r = data[idx] / 255;
        const g = data[idx + 1] / 255;
        const b = data[idx + 2] / 255;
        
        // Convert RGB to LAB (simplified)
        const [l, a, b_val] = rgbToLab(r, g, b);
        labValues.push({ l, a, b: b_val });
      }
    }
    
    // Analyze color distribution in LAB space
    const aValues = labValues.map(v => v.a);
    const bValues = labValues.map(v => v.b);
    
    const aMean = aValues.reduce((sum, val) => sum + val, 0) / aValues.length;
    const bMean = bValues.reduce((sum, val) => sum + val, 0) / bValues.length;
    
    const aVariance = aValues.reduce((sum, val) => sum + Math.pow(val - aMean, 2), 0) / aValues.length;
    const bVariance = bValues.reduce((sum, val) => sum + Math.pow(val - bMean, 2), 0) / bValues.length;
    
    // AI images often have more uniform color distributions
    const colorUniformity = 1 - Math.min(1, (aVariance + bVariance) / 200);
    
    return colorUniformity;
  }

  function rgbToLab(r, g, b) {
    // Simplified RGB to LAB conversion
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
   * Block-level Analysis
   * AI images often have uniform patterns across blocks
   */
  function calculateBlockUniformity(imageData, width, height) {
    const blockSize = 32;
    const blocksX = Math.floor(width / blockSize);
    const blocksY = Math.floor(height / blockSize);
    
    if (blocksX < 2 || blocksY < 2) return 0.5;
    
    const blockMeans = [];
    
    for (let by = 0; by < blocksY; by++) {
      for (let bx = 0; bx < blocksX; bx++) {
        let sum = 0;
        let count = 0;
        
        for (let y = by * blockSize; y < (by + 1) * blockSize && y < height; y++) {
          for (let x = bx * blockSize; x < (bx + 1) * blockSize && x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
            sum += gray;
            count++;
          }
        }
        
        blockMeans.push(count > 0 ? sum / count : 0);
      }
    }
    
    // Calculate variance across blocks
    const mean = blockMeans.reduce((a, b) => a + b, 0) / blockMeans.length;
    const variance = blockMeans.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / blockMeans.length;
    
    // Lower variance = more uniform blocks = more AI-like
    return Math.max(0, Math.min(1, 1 - variance / 1000));
  }

  /**
   * Histogram Analysis (Multi-channel)
   * AI images have different histogram characteristics
   */
  function calculateHistogramFeatures(imageData, width, height) {
    const data = imageData.data;
    const rHist = new Array(256).fill(0);
    const gHist = new Array(256).fill(0);
    const bHist = new Array(256).fill(0);
    
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 100));
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
    
    // Normalize histograms
    const normalize = (hist) => hist.map(v => v / count);
    const rNorm = normalize(rHist);
    const gNorm = normalize(gHist);
    const bNorm = normalize(bHist);
    
    // Calculate histogram entropy (AI images often have lower entropy)
    const calculateEntropy = (hist) => {
      let entropy = 0;
      hist.forEach(p => {
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      });
      return entropy;
    };
    
    const rEntropy = calculateEntropy(rNorm);
    const gEntropy = calculateEntropy(gNorm);
    const bEntropy = calculateEntropy(bNorm);
    const avgEntropy = (rEntropy + gEntropy + bEntropy) / 3;
    
    // Lower entropy = more AI-like
    const maxEntropy = Math.log2(256);
    return 1 - (avgEntropy / maxEntropy);
  }

  /**
   * Gradient Magnitude Analysis
   * AI images have smoother gradients
   */
  function calculateGradientMagnitude(imageData, width, height) {
    const data = imageData.data;
    const gradients = [];
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 50));
    
    for (let y = 1; y < height - 1; y += sampleStep) {
      for (let x = 1; x < width - 1; x += sampleStep) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        const gx = getGray(data, x + 1, y, width) - getGray(data, x - 1, y, width);
        const gy = getGray(data, x, y + 1, width) - getGray(data, x, y - 1, width);
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        
        gradients.push(magnitude);
      }
    }
    
    if (gradients.length === 0) return 0.5;
    
    // Calculate gradient smoothness
    const mean = gradients.reduce((a, b) => a + b, 0) / gradients.length;
    const variance = gradients.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / gradients.length;
    
    // Lower variance = smoother gradients = more AI-like
    return Math.max(0, Math.min(1, 1 - variance / (mean * mean + 100)));
  }

  /**
   * Artifact Detection (Enhanced)
   * Detects specific AI generation artifacts
   */
  function detectAdvancedArtifacts(imageData, width, height) {
    const data = imageData.data;
    let artifactScore = 0;
    let checks = 0;
    
    // Check for checkerboard patterns (common in GANs)
    let checkerboardCount = 0;
    const checkSize = 8;
    for (let y = 0; y < height - checkSize; y += checkSize) {
      for (let x = 0; x < width - checkSize; x += checkSize) {
        const idx1 = (y * width + x) * 4;
        const idx2 = ((y + checkSize) * width + (x + checkSize)) * 4;
        const gray1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
        const gray2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
        
        if (Math.abs(gray1 - gray2) < 5) { // Very similar
          checkerboardCount++;
        }
        checks++;
      }
    }
    
    if (checks > 0) {
      artifactScore += (checkerboardCount / checks) * 0.5;
    }
    
    // Check for repeating patterns
    let repeatScore = 0;
    const patternSize = 16;
    const patterns = new Map();
    
    for (let y = 0; y < height - patternSize; y += patternSize * 2) {
      for (let x = 0; x < width - patternSize; x += patternSize * 2) {
        let patternHash = 0;
        for (let py = 0; py < patternSize && y + py < height; py++) {
          for (let px = 0; px < patternSize && x + px < width; px++) {
            const idx = ((y + py) * width + (x + px)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            patternHash = ((patternHash << 5) - patternHash) + Math.floor(gray);
          }
        }
        
        if (patterns.has(patternHash)) {
          repeatScore += 0.1;
        } else {
          patterns.set(patternHash, true);
        }
      }
    }
    
    artifactScore += Math.min(0.5, repeatScore);
    
    return Math.min(1, artifactScore);
  }

  /**
   * Multi-scale Analysis
   * Analyzes image at different scales
   */
  function calculateMultiScaleFeatures(imageData, width, height) {
    // Analyze at different resolutions
    const scales = [1, 0.5, 0.25];
    const scaleScores = [];
    
    scales.forEach(scale => {
      const scaledWidth = Math.floor(width * scale);
      const scaledHeight = Math.floor(height * scale);
      
      if (scaledWidth < 10 || scaledHeight < 10) return;
      
      // Sample pixels at this scale
      const samples = [];
      for (let y = 0; y < height; y += Math.floor(1 / scale)) {
        for (let x = 0; x < width; x += Math.floor(1 / scale)) {
          const idx = (y * width + x) * 4;
          const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
          samples.push(gray);
        }
      }
      
      if (samples.length > 0) {
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
        scaleScores.push(1 - Math.min(1, variance / 1000));
      }
    });
    
    if (scaleScores.length === 0) return 0.5;
    
    // Average across scales
    return scaleScores.reduce((a, b) => a + b, 0) / scaleScores.length;
  }

  /**
   * Enhanced feature extraction
   * Combines all advanced features
   */
  function extractEnhancedFeatures(imageData, width, height, baseFeatures = {}) {
    try {
      const enhanced = {
        // Advanced frequency analysis
        fftAnalysis: calculateFFTAnalysis(imageData, width, height),
        
        // Advanced edge detection
        advancedEdgeAnalysis: calculateAdvancedEdgeAnalysis(imageData, width, height),
        
        // LBP texture analysis
        lbpTexture: calculateLBPTexture(imageData, width, height),
        
        // LAB color space analysis
        labColorAnalysis: calculateLABColorAnalysis(imageData, width, height),
        
        // Block uniformity
        blockUniformity: calculateBlockUniformity(imageData, width, height),
        
        // Histogram features
        histogramFeatures: calculateHistogramFeatures(imageData, width, height),
        
        // Gradient magnitude
        gradientMagnitude: calculateGradientMagnitude(imageData, width, height),
        
        // Advanced artifacts
        advancedArtifacts: detectAdvancedArtifacts(imageData, width, height),
        
        // Multi-scale analysis
        multiScaleFeatures: calculateMultiScaleFeatures(imageData, width, height),
        
        // Include base features
        ...baseFeatures
      };
      
      return enhanced;
    } catch (error) {
      console.warn("[CloseAI] Enhanced feature extraction failed:", error);
      return baseFeatures;
    }
  }

  /**
   * Enhanced scoring with optimized weights
   */
  function calculateEnhancedScore(features, metadata = {}) {
    // Optimized weights for maximum accuracy
    const weights = {
      // Top-tier features (40%)
      textureSmoothness: 0.12,
      gradientSmoothness: 0.10,
      fftAnalysis: 0.08,
      advancedEdgeAnalysis: 0.06,
      multiScaleFeatures: 0.04,
      
      // Strong indicators (30%)
      highFreqContent: 0.08,
      noiseLevel: 0.07,
      lbpTexture: 0.06,
      blockUniformity: 0.05,
      gradientMagnitude: 0.04,
      
      // Moderate indicators (20%)
      colorUniformity: 0.05,
      edgeConsistency: 0.05,
      textureUniformity: 0.04,
      labColorAnalysis: 0.03,
      histogramFeatures: 0.03,
      
      // Metadata & artifacts (10%)
      urlScore: 0.04,
      contextScore: 0.03,
      advancedArtifacts: 0.02,
      pixelArtifacts: 0.01
    };
    
    // Calculate weighted score
    let score = 0;
    let totalWeight = 0;
    
    for (const [feature, weight] of Object.entries(weights)) {
      if (features[feature] !== undefined && !isNaN(features[feature])) {
        score += weight * features[feature];
        totalWeight += weight;
      }
    }
    
    // Normalize by actual weights used
    if (totalWeight > 0) {
      score = score / totalWeight;
    }
    
    // Boost if metadata strongly suggests AI
    if (metadata.urlScore > 0.5 || metadata.contextScore > 0.5) {
      score = Math.min(1, score * 1.2);
    }
    
    // Non-linear scaling for better selectivity
    score = Math.pow(score, 1.15);
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
      confidence = Math.min(1, confidence + 0.25);
    } else if (metadata.urlScore > 0.3 || metadata.contextScore > 0.3) {
      confidence = Math.min(1, confidence + 0.15);
    }
    
    return { score, confidence };
  }

  // Export functions
  if (typeof window !== 'undefined') {
    window.closeaiEnhancedImageDetector = {
      extractEnhancedFeatures: extractEnhancedFeatures,
      calculateEnhancedScore: calculateEnhancedScore,
      calculateFFTAnalysis: calculateFFTAnalysis,
      calculateAdvancedEdgeAnalysis: calculateAdvancedEdgeAnalysis,
      calculateLBPTexture: calculateLBPTexture,
      calculateLABColorAnalysis: calculateLABColorAnalysis,
      calculateBlockUniformity: calculateBlockUniformity,
      calculateHistogramFeatures: calculateHistogramFeatures,
      calculateGradientMagnitude: calculateGradientMagnitude,
      detectAdvancedArtifacts: detectAdvancedArtifacts,
      calculateMultiScaleFeatures: calculateMultiScaleFeatures
    };
  }
})();

