/**
 * Detection History Manager
 * Logs all detected AI content for export and analysis
 */

(function() {
  'use strict';

  const MAX_HISTORY_ITEMS = 1000; // Keep last 1000 detections
  const HISTORY_KEY = 'detectionHistory';
  const SITE_SETTINGS_KEY = 'siteSettings';

  /**
   * Log a detection event
   */
  function logDetection(type, score, confidence, url, content, isImage = false) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get([HISTORY_KEY], (result) => {
      const history = result[HISTORY_KEY] || [];
      
      const detection = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        type: type, // 'text' or 'image'
        score: score,
        confidence: confidence || null,
        certainty: calculateCertainty(score, confidence),
        url: url,
        domain: extractDomain(url),
        content: isImage ? null : (content ? content.substring(0, 200) : null), // Truncate text
        isImage: isImage
      };

      history.unshift(detection); // Add to beginning
      
      // Keep only last MAX_HISTORY_ITEMS
      if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS);
      }

      chrome.storage.local.set({ [HISTORY_KEY]: history });
    });
  }

  /**
   * Get detection history
   */
  function getHistory(callback) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      callback([]);
      return;
    }

    chrome.storage.local.get([HISTORY_KEY], (result) => {
      callback(result[HISTORY_KEY] || []);
    });
  }

  /**
   * Clear detection history
   */
  function clearHistory(callback) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      if (callback) callback();
      return;
    }

    chrome.storage.local.set({ [HISTORY_KEY]: [] }, () => {
      if (callback) callback();
    });
  }

  /**
   * Get site settings (whitelist/blacklist/sensitivity)
   */
  function getSiteSettings(domain, callback) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      callback(null);
      return;
    }

    chrome.storage.local.get([SITE_SETTINGS_KEY], (result) => {
      const settings = result[SITE_SETTINGS_KEY] || {};
      callback(settings[domain] || null);
    });
  }

  /**
   * Set site settings
   */
  function setSiteSettings(domain, settings, callback) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      if (callback) callback();
      return;
    }

    chrome.storage.local.get([SITE_SETTINGS_KEY], (result) => {
      const allSettings = result[SITE_SETTINGS_KEY] || {};
      allSettings[domain] = settings;
      chrome.storage.local.set({ [SITE_SETTINGS_KEY]: allSettings }, () => {
        if (callback) callback();
      });
    });
  }

  /**
   * Check if domain is whitelisted
   */
  function isWhitelisted(domain, callback) {
    getSiteSettings(domain, (settings) => {
      callback(settings && settings.whitelisted === true);
    });
  }

  /**
   * Check if domain is blacklisted
   */
  function isBlacklisted(domain, callback) {
    getSiteSettings(domain, (settings) => {
      callback(settings && settings.blacklisted === true);
    });
  }

  /**
   * Get sensitivity threshold for domain (0-1, lower = more sensitive)
   */
  function getSensitivity(domain, callback) {
    getSiteSettings(domain, (settings) => {
      callback(settings && settings.sensitivity !== undefined ? settings.sensitivity : null);
    });
  }

  /**
   * Extract domain from URL
   */
  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  /**
   * Calculate certainty from score and confidence
   */
  function calculateCertainty(score, confidence) {
    if (confidence !== null && confidence !== undefined) {
      return Math.min(1, (score * 0.7 + confidence * 0.3));
    }
    return score;
  }

  // Export functions to global scope for use in content.js
  if (typeof window !== 'undefined') {
    window.closeaiHistory = {
      logDetection: logDetection,
      getHistory: getHistory,
      clearHistory: clearHistory,
      getSiteSettings: getSiteSettings,
      setSiteSettings: setSiteSettings,
      isWhitelisted: isWhitelisted,
      isBlacklisted: isBlacklisted,
      getSensitivity: getSensitivity,
      extractDomain: extractDomain
    };
  }
})();

