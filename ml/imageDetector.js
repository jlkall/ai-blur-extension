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
 * Extract metadata and context clues from image
 */
async function extractImageMetadata(img) {
  const metadata = {
    urlScore: 0,
    contextScore: 0,
    sizeScore: 0,
    formatScore: 0
  };
  
  // Check URL patterns for known AI generators
  const aiGeneratorDomains = [
    'midjourney', 'dalle', 'stable-diffusion', 'dreamstudio', 'leonardo.ai',
    'lexica.art', 'nightcafe', 'artbreeder', 'thispersondoesnotexist',
    'thiswaifudoesnotexist', 'generated.photos', 'runwayml', 'replicate',
    'huggingface', 'civitai', 'image-generator', 'deepai', 'deepseek',
    'craiyon', 'wombo', 'starryai', 'neural.love', 'pixray', 'imagen',
    'parti', 'flamingo', 'make-a-scene', 'imagenet', 'disco-diffusion'
  ];
  
  const src = img.src || img.currentSrc || '';
  const lowerSrc = src.toLowerCase();
  
  // Check domain in image URL
  for (const domain of aiGeneratorDomains) {
    if (lowerSrc.includes(domain)) {
      metadata.urlScore = 0.8; // Strong indicator
      break;
    }
  }
  
  // Also check parent link/context for AI generator domains
  // Google Images and other sites often serve images from CDNs
  let parentElement = img.parentElement;
  let linkElement = null;
  let parentText = '';
  
  // Find nearest link element and collect parent text
  let currentElement = img.parentElement;
  for (let i = 0; i < 5 && currentElement; i++) {
    if (currentElement.tagName === 'A' || currentElement.tagName === 'a') {
      linkElement = currentElement;
    }
    parentText += ' ' + (currentElement.textContent || '');
    currentElement = currentElement.parentElement;
  }
  parentText = parentText.toLowerCase();
  
  if (linkElement) {
    const linkHref = (linkElement.href || '').toLowerCase();
    const linkText = (linkElement.textContent || '').toLowerCase();
    
    // Check link URL for AI generator domains
    for (const domain of aiGeneratorDomains) {
      if (linkHref.includes(domain)) {
        metadata.urlScore = Math.max(metadata.urlScore, 0.85); // Even stronger if in link
        break;
      }
    }
    
    // Check link text for AI generator names
    for (const domain of aiGeneratorDomains) {
      if (linkText.includes(domain)) {
        metadata.contextScore = Math.max(metadata.contextScore, 0.7);
        break;
      }
    }
  }
  
  // Check URL patterns
  if (lowerSrc.includes('ai-generated') || lowerSrc.includes('ai_generated') ||
      lowerSrc.includes('ai-generated-image') || lowerSrc.includes('generated-by-ai')) {
    metadata.urlScore = Math.max(metadata.urlScore, 0.7);
  }
  
  // Check for common AI image CDN patterns
  if (lowerSrc.includes('/ai/') || lowerSrc.includes('/generated/') ||
      lowerSrc.includes('/synthetic/') || lowerSrc.includes('/artificial/')) {
    metadata.urlScore = Math.max(metadata.urlScore, 0.5);
  }
  
  // Check image dimensions (AI images often have specific sizes)
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  
  // Common AI image dimensions (square or specific ratios)
  if (width === height) {
    // Square images are common for AI art
    if (width === 512 || width === 1024 || width === 768 || width === 1536) {
      metadata.sizeScore = 0.4;
    }
  }
  
  // Check aspect ratios common in AI art
  const aspectRatio = width / height;
  if (Math.abs(aspectRatio - 1.0) < 0.1 || // Square
      Math.abs(aspectRatio - 1.5) < 0.1 || // 3:2
      Math.abs(aspectRatio - 0.667) < 0.1) { // 2:3
    metadata.sizeScore = Math.max(metadata.sizeScore, 0.2);
  }
  
  // Check context (alt text, title, parent elements, etc.)
  const alt = (img.alt || '').toLowerCase();
  const title = (img.title || '').toLowerCase();
  
  // parentText already collected above
  const allContext = (alt + ' ' + title + ' ' + parentText).toLowerCase();
  
  const aiKeywords = [
    'ai generated', 'ai-generated', 'artificial intelligence', 'machine learning',
    'neural network', 'deep learning', 'generated by ai', 'synthetic',
    'midjourney', 'dalle', 'stable diffusion', 'ai art', 'ai image',
    'image generator', 'image-generator', 'ai image generator', '100% free',
    'ai generator', 'ai-generator'
  ];
  
  for (const keyword of aiKeywords) {
    if (allContext.includes(keyword)) {
      metadata.contextScore = Math.max(metadata.contextScore, 0.6);
    }
  }
  
  // Special check for "AI Image Generator" text (common on image-generator.com)
  if (allContext.includes('ai image generator') || allContext.includes('image generator')) {
    metadata.contextScore = Math.max(metadata.contextScore, 0.75);
  }
  
  // Check for common AI image file naming patterns
  if (src.match(/[a-f0-9]{32,}/) || // Long hex strings (common in AI generators)
      src.match(/seed-\d+/) || // Seed parameters
      src.match(/prompt-/) || // Prompt in URL
      src.match(/gen-\d+/) || // Generation numbers
      src.match(/\/\d{10,}\./)) { // Long numeric IDs
    metadata.urlScore = Math.max(metadata.urlScore, 0.4);
  }
  
  // Check image format (some formats more common for AI)
  const format = src.split('.').pop()?.toLowerCase();
  if (format === 'webp' && width > 500) {
    // WebP is common for AI images, but also for optimized photos
    metadata.formatScore = 0.1;
  }
  
  return metadata;
}

/**
 * Analyze image using canvas to extract features
 */
async function analyzeImageFeatures(img) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Use larger size for better accuracy (but still limit for performance)
    const maxSize = 768;
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
      // Check for CORS issues - if image is from different origin, canvas will throw
      // Try to draw image, catch CORS errors gracefully
      try {
        ctx.drawImage(img, 0, 0, width, height);
      } catch (drawError) {
        // CORS error or other draw error - can't analyze this image visually
        // Return null to fall back to metadata-only detection
        resolve(null);
        return;
      }
      
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Extract comprehensive features
      const features = {
        // Color statistics
        colorVariance: calculateColorVariance(data),
        colorUniformity: calculateColorUniformity(data),
        colorSaturation: calculateColorSaturation(data),
        
        // Edge detection (AI images often have smoother edges)
        edgeSharpness: calculateEdgeSharpness(imageData, width, height),
        edgeConsistency: calculateEdgeConsistency(imageData, width, height),
        
        // Frequency analysis (AI images have specific frequency patterns)
        frequencyPattern: calculateFrequencyPattern(data, width, height),
        highFreqContent: calculateHighFreqContent(imageData, width, height),
        
        // Texture analysis
        textureUniformity: calculateTextureUniformity(imageData, width, height),
        textureSmoothness: calculateTextureSmoothness(imageData, width, height),
        
        // AI-specific artifacts
        unnaturalSymmetry: calculateSymmetry(imageData, width, height),
        gradientSmoothness: calculateGradientSmoothness(imageData, width, height),
        noiseLevel: calculateNoiseLevel(imageData, width, height),
        
        // Composition heuristics
        compositionScore: calculateCompositionScore(imageData, width, height),
        
        // New: Check for AI artifacts in pixel patterns
        pixelArtifacts: detectPixelArtifacts(imageData, width, height),
        colorBanding: detectColorBanding(imageData, width, height),
        
        // Metadata hints (if available)
        hasMetadata: img.complete && img.naturalWidth > 0
      };
      
      resolve(features);
    } catch (error) {
      // Silently fail - don't spam console with CORS errors
      // These are expected for cross-origin images
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
 * Calculate color saturation (AI images often have unnatural saturation)
 */
function calculateColorSaturation(data) {
  let totalSaturation = 0;
  let count = 0;
  
  for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const saturation = max === 0 ? 0 : delta / max;
    
    totalSaturation += saturation;
    count++;
  }
  
  const avgSaturation = count > 0 ? totalSaturation / count : 0;
  // Very high or very low saturation can indicate AI (unnatural)
  const saturationDeviation = Math.abs(avgSaturation - 0.4); // 0.4 is typical for photos
  return Math.min(1, saturationDeviation * 2);
}

/**
 * Calculate edge consistency (AI images have more consistent edge patterns)
 */
function calculateEdgeConsistency(imageData, width, height) {
  const data = imageData.data;
  const edgeStrengths = [];
  const sampleRate = 8;
  
  for (let y = 2; y < height - 2; y += sampleRate) {
    for (let x = 2; x < width - 2; x += sampleRate) {
      const idx = (y * width + x) * 4;
      const gx = Math.abs(data[idx - 4] - data[idx + 4]);
      const gy = Math.abs(data[idx - width * 4] - data[idx + width * 4]);
      const gradient = Math.sqrt(gx * gx + gy * gy);
      edgeStrengths.push(gradient);
    }
  }
  
  if (edgeStrengths.length < 10) return 0.5;
  
  const mean = edgeStrengths.reduce((a, b) => a + b, 0) / edgeStrengths.length;
  const variance = edgeStrengths.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / edgeStrengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of variation
  
  // Lower CV = more consistent = more AI-like
  return Math.max(0, Math.min(1, 1 - cv * 2));
}

/**
 * Calculate high frequency content (AI images often lack high-frequency detail)
 */
function calculateHighFreqContent(imageData, width, height) {
  const data = imageData.data;
  let highFreqPixels = 0;
  let totalPixels = 0;
  
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const neighbors = [
        data[idx - 4] + data[idx - 3] + data[idx - 2],
        data[idx + 4] + data[idx + 5] + data[idx + 6],
        data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2],
        data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]
      ].map(v => v / 3);
      
      const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      const diff = Math.abs(center - avgNeighbor);
      
      if (diff > 15) highFreqPixels++; // Significant local variation
      totalPixels++;
    }
  }
  
  const highFreqRatio = totalPixels > 0 ? highFreqPixels / totalPixels : 0;
  // Lower high-freq content = more AI-like
  return 1 - Math.min(1, highFreqRatio * 3);
}

/**
 * Calculate texture smoothness (AI images are often overly smooth)
 */
function calculateTextureSmoothness(imageData, width, height) {
  const data = imageData.data;
  let smoothness = 0;
  let count = 0;
  const sampleRate = 4;
  
  for (let y = 1; y < height - 1; y += sampleRate) {
    for (let x = 1; x < width - 1; x += sampleRate) {
      const idx = (y * width + x) * 4;
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      // Check 8 neighbors
      let neighborDiff = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          const neighbor = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
          neighborDiff += Math.abs(center - neighbor);
        }
      }
      
      const avgDiff = neighborDiff / 8;
      smoothness += 1 / (1 + avgDiff / 10); // Higher for smoother
      count++;
    }
  }
  
  return count > 0 ? smoothness / count : 0.5;
}

/**
 * Calculate symmetry (AI images often have unnatural perfect symmetry)
 */
function calculateSymmetry(imageData, width, height) {
  const data = imageData.data;
  let horizontalSymmetry = 0;
  let verticalSymmetry = 0;
  let count = 0;
  
  const sampleRate = 8;
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  // Horizontal symmetry
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < halfWidth; x += sampleRate) {
      const leftIdx = (y * width + x) * 4;
      const rightIdx = (y * width + (width - 1 - x)) * 4;
      
      const left = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
      const right = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
      
      horizontalSymmetry += 1 - Math.abs(left - right) / 255;
      count++;
    }
  }
  
  // Vertical symmetry
  for (let y = 0; y < halfHeight; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const topIdx = (y * width + x) * 4;
      const bottomIdx = ((height - 1 - y) * width + x) * 4;
      
      const top = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
      const bottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
      
      verticalSymmetry += 1 - Math.abs(top - bottom) / 255;
    }
  }
  
  const avgSymmetry = count > 0 ? (horizontalSymmetry + verticalSymmetry) / (count * 2) : 0;
  // Very high symmetry (>0.9) is suspicious (unnatural)
  return avgSymmetry > 0.9 ? Math.min(1, (avgSymmetry - 0.9) * 10) : 0;
}

/**
 * Calculate gradient smoothness (AI images have very smooth gradients)
 */
function calculateGradientSmoothness(imageData, width, height) {
  const data = imageData.data;
  let gradientSmoothness = 0;
  let count = 0;
  const sampleRate = 4;
  
  for (let y = 1; y < height - 1; y += sampleRate) {
    for (let x = 1; x < width - 1; x += sampleRate) {
      const idx = (y * width + x) * 4;
      
      // Calculate gradient in X and Y
      const gx = Math.abs((data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3 - 
                          (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3);
      const gy = Math.abs((data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3 - 
                          (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3);
      
      const gradient = Math.sqrt(gx * gx + gy * gy);
      // Very smooth gradients (low variation) indicate AI
      gradientSmoothness += 1 / (1 + gradient / 5);
      count++;
    }
  }
  
  return count > 0 ? gradientSmoothness / count : 0.5;
}

/**
 * Calculate noise level (AI images often lack natural noise/grain)
 */
function calculateNoiseLevel(imageData, width, height) {
  const data = imageData.data;
  let noise = 0;
  let count = 0;
  const sampleRate = 4;
  
  for (let y = 1; y < height - 1; y += sampleRate) {
    for (let x = 1; x < width - 1; x += sampleRate) {
      const idx = (y * width + x) * 4;
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      // Check immediate neighbors for high-frequency noise
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push((data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3);
        }
      }
      
      const mean = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / neighbors.length;
      noise += variance;
      count++;
    }
  }
  
  const avgNoise = count > 0 ? noise / count : 0;
  // Very low noise = more AI-like
  return Math.max(0, Math.min(1, 1 - avgNoise / 100));
}

/**
 * Calculate composition score (AI images often have "perfect" composition)
 */
function calculateCompositionScore(imageData, width, height) {
  // Rule of thirds check - AI images often follow it too perfectly
  const thirdW = width / 3;
  const thirdH = height / 3;
  const data = imageData.data;
  
  let ruleOfThirdsScore = 0;
  const keyPoints = [
    [thirdW, thirdH], [thirdW * 2, thirdH],
    [thirdW, thirdH * 2], [thirdW * 2, thirdH * 2]
  ];
  
  for (const [x, y] of keyPoints) {
    const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    // Check if key point has significant content (not just background)
    if (brightness > 50 && brightness < 200) {
      ruleOfThirdsScore += 0.25;
    }
  }
  
  // Perfect rule of thirds is suspicious
  return ruleOfThirdsScore > 0.75 ? 0.6 : 0;
}

/**
 * Detect pixel-level artifacts common in AI images
 */
function detectPixelArtifacts(imageData, width, height) {
  const data = imageData.data;
  let artifactScore = 0;
  let count = 0;
  const sampleRate = 4;
  
  // Check for repeating patterns (common in AI upscaling)
  for (let y = 2; y < height - 2; y += sampleRate) {
    for (let x = 2; x < width - 2; x += sampleRate) {
      const idx = (y * width + x) * 4;
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      // Check for checkerboard-like patterns
      const neighbors = [
        data[idx - 4] + data[idx - 3] + data[idx - 2],
        data[idx + 4] + data[idx + 5] + data[idx + 6],
        data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2],
        data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]
      ].map(v => v / 3);
      
      // Check for alternating pattern
      const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      const diff = Math.abs(center - avgNeighbor);
      
      // Very regular patterns are suspicious
      if (diff < 5 && neighbors.every(n => Math.abs(n - avgNeighbor) < 3)) {
        artifactScore += 0.1;
      }
      
      count++;
    }
  }
  
  return Math.min(1, artifactScore / Math.max(1, count / 10));
}

/**
 * Detect color banding (AI images often have smooth gradients with banding)
 */
function detectColorBanding(imageData, width, height) {
  const data = imageData.data;
  let bandingScore = 0;
  let count = 0;
  const sampleRate = 6;
  
  // Check for color banding in gradients
  for (let y = 1; y < height - 1; y += sampleRate) {
    for (let x = 1; x < width - 1; x += sampleRate) {
      const idx = (y * width + x) * 4;
      
      // Sample horizontal gradient
      const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
      
      // Check for step-like transitions (banding)
      const diff1 = Math.abs(center - left);
      const diff2 = Math.abs(right - center);
      
      // If one transition is large and the other is small, it's banding
      if ((diff1 > 20 && diff2 < 5) || (diff2 > 20 && diff1 < 5)) {
        bandingScore += 0.15;
      }
      
      count++;
    }
  }
  
  return Math.min(1, bandingScore / Math.max(1, count / 5));
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
    // Extract metadata first (fast, no image processing needed)
    const metadata = await extractImageMetadata(img);
    
    // If metadata strongly suggests AI, return early with high confidence
    // Lowered thresholds to catch more cases
    if (metadata.urlScore > 0.5 || metadata.contextScore > 0.5) {
      // Calculate combined metadata score
      const combinedScore = (metadata.urlScore * 0.6 + metadata.contextScore * 0.4);
      const score = Math.min(1, combinedScore * 1.15); // Boost slightly
      
      // Higher confidence if both URL and context agree
      const confidence = (metadata.urlScore > 0.5 && metadata.contextScore > 0.5) ? 0.9 : 0.75;
      
      const result = { 
        score, 
        confidence, 
        features: { metadata },
        metadataBased: true 
      };
      
      // Cache result
      if (imageScoreCache.size >= IMAGE_CACHE_SIZE) {
        const firstKey = imageScoreCache.keys().next().value;
        imageScoreCache.delete(firstKey);
      }
      imageScoreCache.set(cacheKey, result);
      
      return result;
    }
    
    // Otherwise, do visual analysis
    const features = await analyzeImageFeatures(img);
    
    // If visual analysis failed (CORS, etc.), use metadata-only detection
    if (!features) {
      // Fall back to metadata-only scoring
      const metadataScore = (metadata.urlScore * 0.6 + metadata.contextScore * 0.3 + metadata.sizeScore * 0.1);
      if (metadataScore > 0.5) {
        const result = {
          score: Math.min(1, metadataScore * 1.1),
          confidence: 0.7,
          features: { metadata },
          metadataBased: true,
          visualAnalysisFailed: true
        };
        
        // Cache result
        if (imageScoreCache.size >= IMAGE_CACHE_SIZE) {
          const firstKey = imageScoreCache.keys().next().value;
          imageScoreCache.delete(firstKey);
        }
        imageScoreCache.set(cacheKey, result);
        
        return result;
      }
      return { score: 0, confidence: 0 };
    }
    
    // Improved weighted ensemble scoring with metadata integration
    const weights = {
      // Strong visual indicators
      textureSmoothness: 0.16,      // AI images are often overly smooth
      gradientSmoothness: 0.14,    // Very smooth gradients
      highFreqContent: 0.13,        // Lack of high-frequency detail
      noiseLevel: 0.11,             // Lack of natural noise
      
      // Moderate visual indicators
      colorUniformity: 0.09,        // Uniform color distribution
      edgeConsistency: 0.09,        // Consistent edge patterns
      textureUniformity: 0.07,     // Uniform textures
      
      // Metadata indicators (if available)
      urlScore: 0.08,               // URL patterns
      contextScore: 0.06,           // Context clues
      
      // Artifact detection
      pixelArtifacts: 0.04,         // Pixel-level artifacts
      colorBanding: 0.03,           // Color banding
      
      // Weaker indicators
      unnaturalSymmetry: 0.02,      // Perfect symmetry
      colorSaturation: 0.02,        // Unnatural saturation
      compositionScore: 0.01,       // Too-perfect composition
      sizeScore: 0.01               // Size patterns
    };
    
    // Calculate weighted score with metadata
    let score = 
      weights.textureSmoothness * features.textureSmoothness +
      weights.gradientSmoothness * features.gradientSmoothness +
      weights.highFreqContent * features.highFreqContent +
      weights.noiseLevel * features.noiseLevel +
      weights.colorUniformity * features.colorUniformity +
      weights.edgeConsistency * features.edgeConsistency +
      weights.textureUniformity * features.textureUniformity +
      weights.urlScore * metadata.urlScore +
      weights.contextScore * metadata.contextScore +
      weights.pixelArtifacts * (features.pixelArtifacts || 0) +
      weights.colorBanding * (features.colorBanding || 0) +
      weights.unnaturalSymmetry * features.unnaturalSymmetry +
      weights.colorSaturation * features.colorSaturation +
      weights.compositionScore * features.compositionScore +
      weights.sizeScore * metadata.sizeScore;
    
    // Boost score if metadata suggests AI
    if (metadata.urlScore > 0.3 || metadata.contextScore > 0.3) {
      score = score * 1.15; // 15% boost
    }
    
    // Apply non-linear scaling to be more selective
    score = Math.pow(score, 1.2); // Slightly less aggressive than before
    score = Math.max(0, Math.min(1, score));
    
    // Calculate confidence based on feature agreement and metadata
    const featureValues = [
      features.textureSmoothness,
      features.gradientSmoothness,
      features.highFreqContent,
      features.noiseLevel,
      features.colorUniformity
    ];
    const mean = featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
    const variance = featureValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / featureValues.length;
    
    // Higher confidence if metadata supports visual analysis
    let confidence = Math.max(0.5, Math.min(1, 1 - variance * 1.5));
    if (metadata.urlScore > 0.5 || metadata.contextScore > 0.5) {
      confidence = Math.min(1, confidence + 0.2);
    }
    
    const result = { 
      score, 
      confidence, 
      features: { ...features, metadata },
      metadataBased: false
    };
    
    // Cache result
    if (imageScoreCache.size >= IMAGE_CACHE_SIZE) {
      const firstKey = imageScoreCache.keys().next().value;
      imageScoreCache.delete(firstKey);
    }
    imageScoreCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.warn("[CloseAI] Image detection error:", error);
    return { score: 0, confidence: 0 };
  }
}

// Export functions
if (typeof window !== 'undefined') {
  window.detectAIImage = detectAIImage;
  window.generateSlopImage = generateSlopImage;
}

