/**
 * CloseAI Analytics - Track cloud detection performance
 * Privacy-preserving: Only tracks aggregated metrics, no content
 */

(function() {
  'use strict';

  const METRICS_KEY = 'closeai_metrics';
  const MAX_METRICS_AGE_DAYS = 30; // Keep metrics for 30 days

  /**
   * Initialize metrics storage
   */
  function initMetrics() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get([METRICS_KEY], (result) => {
      if (!result[METRICS_KEY]) {
        const initialMetrics = {
          cloud: {
            requests: 0,
            cacheHits: 0,
            errors: 0,
            avgResponseTime: 0,
            scoreImprovements: [],
            lastUpdated: Date.now()
          },
          local: {
            detections: 0,
            avgConfidence: 0,
            avgScore: 0,
            lastUpdated: Date.now()
          },
          hybrid: {
            totalDetections: 0,
            cloudUsed: 0,
            localOnly: 0,
            avgScoreDelta: 0, // Difference between cloud and local scores
            lastUpdated: Date.now()
          },
          startDate: Date.now()
        };
        chrome.storage.local.set({ [METRICS_KEY]: initialMetrics });
      }
    });
  }

  /**
   * Track cloud detection request
   */
  function trackCloudRequest(responseTime, cached = false, error = false) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get([METRICS_KEY], (result) => {
      const metrics = result[METRICS_KEY] || {};
      
      if (!metrics.cloud) {
        metrics.cloud = {
          requests: 0,
          cacheHits: 0,
          errors: 0,
          avgResponseTime: 0,
          scoreImprovements: [],
          lastUpdated: Date.now()
        };
      }

      metrics.cloud.requests++;
      if (cached) metrics.cloud.cacheHits++;
      if (error) metrics.cloud.errors++;

      // Update average response time
      const totalRequests = metrics.cloud.requests - metrics.cloud.errors;
      if (totalRequests > 0 && responseTime > 0) {
        metrics.cloud.avgResponseTime = 
          (metrics.cloud.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
      }

      metrics.cloud.lastUpdated = Date.now();
      chrome.storage.local.set({ [METRICS_KEY]: metrics });
    });
  }

  /**
   * Track score improvement from cloud detection
   */
  function trackScoreImprovement(localScore, cloudScore) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    const improvement = cloudScore - localScore;
    
    chrome.storage.local.get([METRICS_KEY], (result) => {
      const metrics = result[METRICS_KEY] || {};
      
      if (!metrics.cloud) {
        metrics.cloud = {
          requests: 0,
          cacheHits: 0,
          errors: 0,
          avgResponseTime: 0,
          scoreImprovements: [],
          lastUpdated: Date.now()
        };
      }

      // Keep last 100 improvements
      metrics.cloud.scoreImprovements.push({
        localScore: localScore,
        cloudScore: cloudScore,
        improvement: improvement,
        timestamp: Date.now()
      });

      if (metrics.cloud.scoreImprovements.length > 100) {
        metrics.cloud.scoreImprovements.shift();
      }

      metrics.cloud.lastUpdated = Date.now();
      chrome.storage.local.set({ [METRICS_KEY]: metrics });
    });
  }

  /**
   * Track local detection
   */
  function trackLocalDetection(score, confidence) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get([METRICS_KEY], (result) => {
      const metrics = result[METRICS_KEY] || {};
      
      if (!metrics.local) {
        metrics.local = {
          detections: 0,
          avgConfidence: 0,
          avgScore: 0,
          lastUpdated: Date.now()
        };
      }

      metrics.local.detections++;
      
      // Update averages
      const total = metrics.local.detections;
      metrics.local.avgScore = (metrics.local.avgScore * (total - 1) + score) / total;
      if (confidence !== null && confidence !== undefined) {
        metrics.local.avgConfidence = (metrics.local.avgConfidence * (total - 1) + confidence) / total;
      }

      metrics.local.lastUpdated = Date.now();
      chrome.storage.local.set({ [METRICS_KEY]: metrics });
    });
  }

  /**
   * Track hybrid detection (local + cloud)
   */
  function trackHybridDetection(usedCloud, localScore, cloudScore) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get([METRICS_KEY], (result) => {
      const metrics = result[METRICS_KEY] || {};
      
      if (!metrics.hybrid) {
        metrics.hybrid = {
          totalDetections: 0,
          cloudUsed: 0,
          localOnly: 0,
          avgScoreDelta: 0,
          lastUpdated: Date.now()
        };
      }

      metrics.hybrid.totalDetections++;
      if (usedCloud) {
        metrics.hybrid.cloudUsed++;
        if (cloudScore !== undefined && localScore !== undefined) {
          const delta = cloudScore - localScore;
          const total = metrics.hybrid.cloudUsed;
          metrics.hybrid.avgScoreDelta = (metrics.hybrid.avgScoreDelta * (total - 1) + delta) / total;
        }
      } else {
        metrics.hybrid.localOnly++;
      }

      metrics.hybrid.lastUpdated = Date.now();
      chrome.storage.local.set({ [METRICS_KEY]: metrics });
    });
  }

  /**
   * Get analytics summary
   */
  function getAnalytics() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        resolve(null);
        return;
      }

      chrome.storage.local.get([METRICS_KEY], (result) => {
        const metrics = result[METRICS_KEY];
        if (!metrics) {
          resolve(null);
          return;
        }

        // Calculate derived metrics
        const cloud = metrics.cloud || {};
        const local = metrics.local || {};
        const hybrid = metrics.hybrid || {};

        const cacheHitRate = cloud.requests > 0 
          ? (cloud.cacheHits / cloud.requests) * 100 
          : 0;

        const errorRate = cloud.requests > 0
          ? (cloud.errors / cloud.requests) * 100
          : 0;

        const cloudUsageRate = hybrid.totalDetections > 0
          ? (hybrid.cloudUsed / hybrid.totalDetections) * 100
          : 0;

        const avgImprovement = cloud.scoreImprovements && cloud.scoreImprovements.length > 0
          ? cloud.scoreImprovements.reduce((sum, imp) => sum + imp.improvement, 0) / cloud.scoreImprovements.length
          : 0;

        resolve({
          cloud: {
            totalRequests: cloud.requests || 0,
            cacheHits: cloud.cacheHits || 0,
            cacheHitRate: cacheHitRate.toFixed(2) + '%',
            errors: cloud.errors || 0,
            errorRate: errorRate.toFixed(2) + '%',
            avgResponseTime: (cloud.avgResponseTime || 0).toFixed(0) + 'ms',
            avgScoreImprovement: (avgImprovement * 100).toFixed(2) + '%',
            lastUpdated: cloud.lastUpdated || null
          },
          local: {
            totalDetections: local.detections || 0,
            avgScore: ((local.avgScore || 0) * 100).toFixed(2) + '%',
            avgConfidence: ((local.avgConfidence || 0) * 100).toFixed(2) + '%',
            lastUpdated: local.lastUpdated || null
          },
          hybrid: {
            totalDetections: hybrid.totalDetections || 0,
            cloudUsed: hybrid.cloudUsed || 0,
            localOnly: hybrid.localOnly || 0,
            cloudUsageRate: cloudUsageRate.toFixed(2) + '%',
            avgScoreDelta: ((hybrid.avgScoreDelta || 0) * 100).toFixed(2) + '%',
            lastUpdated: hybrid.lastUpdated || null
          },
          uptime: {
            days: Math.floor((Date.now() - (metrics.startDate || Date.now())) / (1000 * 60 * 60 * 24)),
            startDate: new Date(metrics.startDate || Date.now()).toLocaleDateString()
          }
        });
      });
    });
  }

  /**
   * Clear all metrics
   */
  function clearMetrics() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }
    chrome.storage.local.remove([METRICS_KEY]);
    initMetrics();
  }

  // Initialize on load
  initMetrics();

  // Export functions
  if (typeof window !== 'undefined') {
    window.closeaiAnalytics = {
      trackCloudRequest,
      trackScoreImprovement,
      trackLocalDetection,
      trackHybridDetection,
      getAnalytics,
      clearMetrics
    };
  }
})();



