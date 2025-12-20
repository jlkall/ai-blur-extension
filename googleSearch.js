/**
 * Google Search Enhancement
 * Automatically appends "-ai" to search queries to prevent AI overviews
 */

(function() {
  'use strict';

  // Extension enabled state (default to true)
  let extensionEnabled = true;

  // Load enabled state from storage
  function loadEnabledState() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['enabled'], (result) => {
        const wasEnabled = extensionEnabled;
        extensionEnabled = result.enabled !== false; // Default to true
        if (!extensionEnabled) {
          console.log("[CloseAI] Google search modification disabled");
          // Immediately remove -ai if we're on a search page
          if (isGoogleSearch()) {
            removeMinusAI();
          }
        } else if (!wasEnabled && isGoogleSearch()) {
          // If we just enabled, add -ai
          appendMinusAI();
        }
      });
    }
  }

  // Load state on initialization
  loadEnabledState();
  
  // Also check periodically to catch state changes
  setInterval(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['enabled'], (result) => {
        const newState = result.enabled !== false;
        if (newState !== extensionEnabled) {
          extensionEnabled = newState;
          if (isGoogleSearch()) {
            if (extensionEnabled) {
              appendMinusAI();
            } else {
              removeMinusAI();
            }
          }
        }
      });
    }
  }, 500);

  // Listen for toggle messages from popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggle') {
        extensionEnabled = message.enabled;
        console.log("[CloseAI] Google search modification toggled:", extensionEnabled ? "enabled" : "disabled");
        sendResponse({ success: true });
      }
      return true;
    });
  }

  // Check if we're on Google search
  function isGoogleSearch() {
    return window.location.hostname.includes('google.com') && 
           (window.location.pathname === '/search' || window.location.pathname.startsWith('/search/'));
  }

  // Extract query from URL
  function getSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || params.get('query') || '';
  }

  // Remove -ai from query if extension is disabled
  function removeMinusAI() {
    if (!isGoogleSearch()) return;

    const params = new URLSearchParams(window.location.search);
    let query = params.get('q');
    
    if (!query) return;
    
    // Check if -ai is appended and remove it
    const queryLower = query.toLowerCase().trim();
    if (queryLower.endsWith(' -ai')) {
      const newQuery = query.trim().slice(0, -4); // Remove ' -ai'
      params.set('q', newQuery);
      
      const newUrl = window.location.pathname + '?' + params.toString() + (window.location.hash || '');
      if (window.location.href !== newUrl) {
        window.location.href = newUrl;
      }
    } else if (queryLower.endsWith('-ai')) {
      const newQuery = query.trim().slice(0, -3); // Remove '-ai'
      params.set('q', newQuery);
      
      const newUrl = window.location.pathname + '?' + params.toString() + (window.location.hash || '');
      if (window.location.href !== newUrl) {
        window.location.href = newUrl;
      }
    }
  }

  // Modify URL to append -ai
  function appendMinusAI() {
    if (!isGoogleSearch()) return;
    if (!extensionEnabled) {
      // If disabled, remove -ai if present
      removeMinusAI();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    let query = params.get('q');
    
    if (!query) return;
    
    // Check if -ai is already appended
    const queryLower = query.toLowerCase().trim();
    if (queryLower.endsWith(' -ai') || queryLower.endsWith('-ai')) {
      return; // Already has -ai
    }
    
    // Append -ai to the query
    const newQuery = query.trim() + ' -ai';
    params.set('q', newQuery);
    
    // Update URL and reload to get new results without AI overview
    const newUrl = window.location.pathname + '?' + params.toString() + (window.location.hash || '');
    
    // Reload with new query to prevent AI overview
    if (window.location.href !== newUrl) {
      window.location.href = newUrl;
    }
  }

  // Intercept form submissions
  function interceptSearchForm() {
    if (!isGoogleSearch()) return;

    const searchForm = document.querySelector('form[action="/search"]') || 
                       document.querySelector('form[role="search"]') ||
                       document.querySelector('form');
    
    if (!searchForm) return;

    searchForm.addEventListener('submit', function(e) {
      if (!extensionEnabled) {
        // If disabled, remove -ai from input if present
        const searchInput = searchForm.querySelector('input[name="q"]') ||
                            searchForm.querySelector('input[type="text"]') ||
                            searchForm.querySelector('textarea[name="q"]');
        
        if (searchInput) {
          let query = searchInput.value.trim();
          const queryLower = query.toLowerCase();
          if (queryLower.endsWith(' -ai')) {
            searchInput.value = query.slice(0, -4);
          } else if (queryLower.endsWith('-ai')) {
            searchInput.value = query.slice(0, -3);
          }
        }
        return; // Don't modify if disabled
      }

      const searchInput = searchForm.querySelector('input[name="q"]') ||
                          searchForm.querySelector('input[type="text"]') ||
                          searchForm.querySelector('textarea[name="q"]');
      
      if (searchInput) {
        let query = searchInput.value.trim();
        
        // Append -ai if not already present
        if (query && !query.toLowerCase().endsWith(' -ai') && !query.toLowerCase().endsWith('-ai')) {
          searchInput.value = query + ' -ai';
        }
      }
    }, true); // Use capture phase to intercept early
  }

  // Handle URL changes (for SPA navigation)
  let lastUrl = window.location.href;
  
  function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      
      // Small delay to let page settle
      setTimeout(() => {
        if (isGoogleSearch()) {
          if (extensionEnabled) {
            appendMinusAI();
          } else {
            removeMinusAI();
          }
        }
      }, 100);
    }
  }

  // Monitor URL changes
  const urlObserver = new MutationObserver(checkUrlChange);
  
  // Also use popstate for back/forward navigation
  window.addEventListener('popstate', function() {
    setTimeout(() => {
      if (isGoogleSearch()) {
        if (extensionEnabled) {
          appendMinusAI();
        } else {
          removeMinusAI();
        }
      }
    }, 100);
  });

  // Initial setup
  function init() {
    if (isGoogleSearch()) {
      if (extensionEnabled) {
        appendMinusAI();
      } else {
        removeMinusAI();
      }
      interceptSearchForm();
      
      // Start observing
      urlObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also check periodically for SPA navigation
  setInterval(checkUrlChange, 500);
})();

