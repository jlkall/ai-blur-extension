/**
 * AI Image Detection Module
 * Uses statistical and visual features to detect AI-generated images
 */

// Cache for image scores
const imageScoreCache = new Map();
const IMAGE_CACHE_SIZE = 500;

/**
 * Generate a "slop" crayon drawing as a data URL
 * Creates a simple, child-like drawing to replace AI images
 */
function generateSlopImage(width = 400, height = 300) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Random background color (pastel)
  const bgColors = [
    '#FFE5E5', '#E5F3FF', '#FFF5E5', '#E5FFE5', '#F5E5FF', '#FFE5F5'
  ];
  ctx.fillStyle = bgColors[Math.floor(Math.random() * bgColors.length)];
  ctx.fillRect(0, 0, width, height);
  
  // Draw random crayon-like shapes
  const shapes = Math.floor(Math.random() * 5) + 3; // 3-7 shapes
  
  for (let i = 0; i < shapes; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 100 + 50;
    
    // Random crayon colors (bright, saturated)
    const colors = [
      '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF6B9D', '#C44569',
      '#6C5CE7', '#00D2D3', '#FF6348', '#FFA502', '#5F27CD'
    ];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.globalAlpha = 0.6 + Math.random() * 0.4;
    
    // Draw random shapes (circles, rectangles, squiggles)
    const shapeType = Math.random();
    if (shapeType < 0.4) {
      // Circle
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (shapeType < 0.7) {
      // Rectangle
      ctx.fillRect(x - size / 2, y - size / 2, size, size * 0.8);
    } else {
      // Squiggle
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 10; j++) {
        ctx.lineTo(
          x + (Math.random() - 0.5) * size,
          y + (Math.random() - 0.5) * size
        );
      }
      ctx.lineWidth = 8 + Math.random() * 12;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    }
  }
  
  // Add some random lines (like a child's drawing)
  const lineColors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF6B9D', '#C44569',
    '#6C5CE7', '#00D2D3', '#FF6348', '#FFA502', '#5F27CD'
  ];
  ctx.strokeStyle = lineColors[Math.floor(Math.random() * lineColors.length)];
  ctx.lineWidth = 4 + Math.random() * 6;
  ctx.globalAlpha = 0.8;
  
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }
  
  return canvas.toDataURL('image/png');
}

/**
 * Analyze image using canvas to extract features
 */
async function analyzeImageFeatures(img) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Limit size for performance
    const maxSize = 512;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    
    canvas.width = width;
    canvas.height = height;
    
    try {
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Extract features
      const features = {
        // Color statistics
        colorVariance: calculateColorVariance(data),
        colorUniformity: calculateColorUniformity(data),
        
        // Edge detection (AI images often have smoother edges)
        edgeSharpness: calculateEdgeSharpness(imageData, width, height),
        
        // Frequency analysis (AI images have specific frequency patterns)
        frequencyPattern: calculateFrequencyPattern(data, width, height),
        
        // Texture analysis
        textureUniformity: calculateTextureUniformity(imageData, width, height),
        
        // Metadata hints (if available)
        hasMetadata: img.complete && img.naturalWidth > 0
      };
      
      resolve(features);
    } catch (error) {
      console.warn("[AI BLUR] Image analysis error:", error);
      resolve(null);
    }
  });
}

/**
 * Calculate color variance in image
 * AI images often have more uniform color distributions
 */
function calculateColorVariance(data) {
  const rValues = [];
  const gValues = [];
  const bValues = [];
  
  for (let i = 0; i < data.length; i += 4) {
    rValues.push(data[i]);
    gValues.push(data[i + 1]);
    bValues.push(data[i + 2]);
  }
  
  const rVariance = calculateVariance(rValues);
  const gVariance = calculateVariance(gValues);
  const bVariance = calculateVariance(bValues);
  
  return (rVariance + gVariance + bVariance) / 3;
}

function calculateVariance(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return variance;
}

/**
 * Calculate color uniformity
 * Lower uniformity = more AI-like
 */
function calculateColorUniformity(data) {
  const colorCounts = new Map();
  const sampleSize = Math.min(10000, data.length / 4);
  const step = Math.floor(data.length / 4 / sampleSize);
  
  for (let i = 0; i < data.length; i += step * 4) {
    const r = Math.floor(data[i] / 32) * 32; // Quantize
    const g = Math.floor(data[i + 1] / 32) * 32;
    const b = Math.floor(data[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }
  
  // More unique colors = less uniform = more human-like
  const uniqueColors = colorCounts.size;
  const totalSamples = sampleSize;
  const uniformity = 1 - (uniqueColors / totalSamples);
  
  return Math.max(0, Math.min(1, uniformity));
}

/**
 * Calculate edge sharpness
 * AI images often have smoother, less sharp edges
 */
function calculateEdgeSharpness(imageData, width, height) {
  const data = imageData.data;
  let edgeStrength = 0;
  let edgeCount = 0;
  
  // Sample edges (Sobel-like)
  const sampleRate = 4;
  for (let y = 1; y < height - 1; y += sampleRate) {
    for (let x = 1; x < width - 1; x += sampleRate) {
      const idx = (y * width + x) * 4;
      
      // Simple edge detection
      const gx = Math.abs(
        data[idx - 4] - data[idx + 4] + // Left - Right
        (data[idx - width * 4] - data[idx + width * 4]) * 2
      );
      
      const gy = Math.abs(
        data[idx - width * 4] - data[idx + width * 4] + // Top - Bottom
        (data[idx - 4] - data[idx + 4]) * 2
      );
      
      const gradient = Math.sqrt(gx * gx + gy * gy);
      edgeStrength += gradient;
      edgeCount++;
    }
  }
  
  const avgEdgeStrength = edgeCount > 0 ? edgeStrength / edgeCount : 0;
  // Normalize (typical range: 0-100)
  return Math.min(1, avgEdgeStrength / 50);
}

/**
 * Calculate frequency pattern using FFT-like analysis
 * AI images have specific frequency signatures
 */
function calculateFrequencyPattern(data, width, height) {
  // Simplified frequency analysis using block-based DCT approximation
  const blockSize = 8;
  let highFreqEnergy = 0;
  let lowFreqEnergy = 0;
  let blocks = 0;
  
  for (let by = 0; by < height - blockSize; by += blockSize) {
    for (let bx = 0; bx < width - blockSize; bx += blockSize) {
      let blockHighFreq = 0;
      let blockLowFreq = 0;
      
      for (let y = 0; y < blockSize; y++) {
        for (let x = 0; x < blockSize; x++) {
          const idx = ((by + y) * width + (bx + x)) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          // Simple frequency approximation
          const freq = Math.abs(x - blockSize/2) + Math.abs(y - blockSize/2);
          if (freq > blockSize / 2) {
            blockHighFreq += brightness;
          } else {
            blockLowFreq += brightness;
          }
        }
      }
      
      highFreqEnergy += blockHighFreq;
      lowFreqEnergy += blockLowFreq;
      blocks++;
    }
  }
  
  if (blocks === 0) return 0.5;
  
  const highFreqRatio = highFreqEnergy / (highFreqEnergy + lowFreqEnergy);
  // AI images tend to have more low-frequency content
  return 1 - highFreqRatio;
}

/**
 * Calculate texture uniformity
 * AI images often have more uniform textures
 */
function calculateTextureUniformity(imageData, width, height) {
  const data = imageData.data;
  const sampleSize = 1000;
  const step = Math.floor((width * height) / sampleSize);
  
  const localVariances = [];
  
  for (let i = 0; i < sampleSize && i * step < width * height; i++) {
    const idx = (i * step) * 4;
    const x = (idx / 4) % width;
    const y = Math.floor((idx / 4) / width);
    
    if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
      // Calculate local variance in 3x3 neighborhood
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          const brightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
          neighbors.push(brightness);
        }
      }
      
      const mean = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / neighbors.length;
      localVariances.push(variance);
    }
  }
  
  if (localVariances.length === 0) return 0.5;
  
  // Calculate variance of variances (uniformity measure)
  const meanVar = localVariances.reduce((a, b) => a + b, 0) / localVariances.length;
  const varOfVars = localVariances.reduce((sum, val) => sum + Math.pow(val - meanVar, 2), 0) / localVariances.length;
  
  // Lower variance of variances = more uniform = more AI-like
  return Math.max(0, Math.min(1, 1 - (varOfVars / 1000)));
}

/**
 * Detect if an image is AI-generated
 * Returns score from 0 (human) to 1 (AI)
 */
async function detectAIImage(img) {
  if (!img || !img.complete) {
    return { score: 0, confidence: 0 };
  }
  
  // Check cache
  const cacheKey = img.src.substring(0, 100);
  if (imageScoreCache.has(cacheKey)) {
    return imageScoreCache.get(cacheKey);
  }
  
  try {
    const features = await analyzeImageFeatures(img);
    if (!features) {
      return { score: 0, confidence: 0 };
    }
    
    // Weighted ensemble scoring
    const weights = {
      colorUniformity: 0.25,
      edgeSharpness: 0.20,
      frequencyPattern: 0.20,
      textureUniformity: 0.20,
      colorVariance: 0.15
    };
    
    // Invert edgeSharpness (lower sharpness = more AI-like)
    const invertedEdgeSharpness = 1 - features.edgeSharpness;
    
    // Invert colorVariance (lower variance = more AI-like)
    const invertedColorVariance = 1 - Math.min(1, features.colorVariance / 10000);
    
    let score = 
      weights.colorUniformity * features.colorUniformity +
      weights.edgeSharpness * invertedEdgeSharpness +
      weights.frequencyPattern * features.frequencyPattern +
      weights.textureUniformity * features.textureUniformity +
      weights.colorVariance * invertedColorVariance;
    
    score = Math.max(0, Math.min(1, score));
    
    // Calculate confidence (simplified)
    const confidence = 0.7; // Moderate confidence for statistical features
    
    const result = { score, confidence, features };
    
    // Cache result
    if (imageScoreCache.size >= IMAGE_CACHE_SIZE) {
      const firstKey = imageScoreCache.keys().next().value;
      imageScoreCache.delete(firstKey);
    }
    imageScoreCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.warn("[AI BLUR] Image detection error:", error);
    return { score: 0, confidence: 0 };
  }
}

// Export functions
if (typeof window !== 'undefined') {
  window.detectAIImage = detectAIImage;
  window.generateSlopImage = generateSlopImage;
}

