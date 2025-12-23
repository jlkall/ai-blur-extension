/**
 * CloseAI Cloud Detection Worker
 * Free tier: 100,000 requests/day
 * Runs on Cloudflare's edge network globally
 */

// CORS headers for extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Main worker handler
 */
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    try {
      const { hash, features, metadata } = await request.json();

      // Validate input
      if (!hash || !features) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: hash and features' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check cache first (Upstash Redis)
      let cached = null;
      if (env.REDIS_URL && env.REDIS_TOKEN) {
        cached = await checkCache(env.REDIS_URL, env.REDIS_TOKEN, hash);
        if (cached) {
          return new Response(JSON.stringify(cached), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Run detection using statistical features
      const score = await detectAI(features, metadata);

      // Cache result (24 hour TTL)
      if (env.REDIS_URL && env.REDIS_TOKEN && score) {
        await cacheResult(env.REDIS_URL, env.REDIS_TOKEN, hash, score, 86400);
      }

      return new Response(JSON.stringify(score), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Check cache in Upstash Redis
 */
async function checkCache(redisUrl, redisToken, hash) {
  try {
    const response = await fetch(`${redisUrl}/get/${hash}`, {
      headers: {
        'Authorization': `Bearer ${redisToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.result) {
        return JSON.parse(data.result);
      }
    }
  } catch (error) {
    console.error('Cache check error:', error);
  }
  return null;
}

/**
 * Cache result in Upstash Redis
 */
async function cacheResult(redisUrl, redisToken, hash, score, ttl) {
  try {
    await fetch(`${redisUrl}/setex/${hash}/${ttl}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${redisToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(score)
    });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Detect AI using statistical features
 * This matches the logic from your extension
 */
async function detectAI(features, metadata = {}) {
  // Extract features
  const {
    entropy = 0,
    avgSentenceLength = 0,
    wordDiversity = 0,
    punctuationDensity = 0,
    stopwordDensity = 0,
    sentenceVariance = 0,
    repetition = 0,
    wordEntropy = 0
  } = features;

  // Calculate scores (matching your extension's logic)
  const scores = [
    { weight: 0.35, value: normalizeFeature(entropy, 0, 5) },
    { weight: 0.20, value: normalizeFeature(sentenceVariance, 0, 50) },
    { weight: 0.15, value: normalizeFeature(stopwordDensity, 0, 1) },
    { weight: 0.15, value: normalizeFeature(wordDiversity, 0, 1) },
    { weight: 0.10, value: normalizeFeature(repetition, 0, 1) },
    { weight: 0.05, value: normalizeFeature(wordEntropy, 0, 1) }
  ];

  // Calculate weighted score
  let score = scores.reduce((sum, s) => sum + s.weight * s.value, 0);
  
  // Normalize to 0-1 range
  score = Math.max(0, Math.min(1, score));

  // Calculate confidence based on feature agreement
  const featureValues = scores.map(s => s.value);
  const mean = featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
  const variance = featureValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / featureValues.length;
  const confidence = Math.max(0.5, Math.min(1, 1 - variance * 1.2));

  return {
    score: score,
    confidence: confidence,
    source: 'cloud',
    modelVersion: '1.0'
  };
}

/**
 * Normalize feature value to 0-1 range
 */
function normalizeFeature(value, min, max) {
  if (max === min) return 0.5;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
}

