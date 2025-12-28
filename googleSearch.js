/**
 * Google Search Enhancement
 * Automatically appends "-ai" to search queries to prevent AI overviews
 */

(function() {
  'use strict';

  // Extension enabled state (default to true)
  let extensionEnabled = true;
  let isProcessing = false; // Flag to prevent recursive calls
  let hasProcessed = false; // Flag to prevent multiple modifications on same page load

  // Load enabled state from storage
  function loadEnabledState(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['enabled'], (result) => {
        extensionEnabled = result.enabled !== false; // Default to true
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
  }

  // Listen for toggle messages from popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggle') {
        const wasEnabled = extensionEnabled;
        extensionEnabled = message.enabled;
        console.log("[CloseAI] Google search modification toggled:", extensionEnabled ? "enabled" : "disabled");
        
        // Only modify if state actually changed and we're on a search page
        if (wasEnabled !== extensionEnabled && isGoogleSearch() && !isProcessing) {
          hasProcessed = false; // Reset flag to allow modification
          if (extensionEnabled) {
            appendMinusAI();
          } else {
            removeMinusAI();
          }
        }
        
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
    if (!isGoogleSearch() || isProcessing) return;
    
    const params = new URLSearchParams(window.location.search);
    let query = params.get('q');
    
    if (!query) return;
    
    // Check if -ai is appended and remove it
    const queryLower = query.toLowerCase().trim();
    if (queryLower.endsWith(' -ai') || queryLower.endsWith('-ai')) {
      isProcessing = true;
      const newQuery = queryLower.endsWith(' -ai') 
        ? query.trim().slice(0, -4) 
        : query.trim().slice(0, -3);
      params.set('q', newQuery);
      
      const newUrl = window.location.pathname + '?' + params.toString() + (window.location.hash || '');
      if (window.location.href !== newUrl) {
        // Use replaceState to avoid triggering navigation events
        window.history.replaceState(null, '', newUrl);
        // Update the search input if it exists
        const searchInput = document.querySelector('input[name="q"]') ||
                          document.querySelector('input[type="text"]') ||
                          document.querySelector('textarea[name="q"]');
        if (searchInput) {
          searchInput.value = newQuery;
        }
      }
      setTimeout(() => { isProcessing = false; }, 100);
    }
  }

  // Modify URL to append -ai and IMMEDIATELY reload
  function appendMinusAI() {
    if (!isGoogleSearch() || isProcessing || !extensionEnabled) return;

    const params = new URLSearchParams(window.location.search);
    let query = params.get('q');
    
    if (!query) return;
    
    // Check if -ai is already appended
    const queryLower = query.toLowerCase().trim();
    if (queryLower.endsWith(' -ai') || queryLower.endsWith('-ai')) {
      return; // Already has -ai, no need to reload
    }
    
    isProcessing = true;
    // Append -ai to the query
    const newQuery = query.trim() + ' -ai';
    params.set('q', newQuery);
    
    // Build new URL
    const newUrl = window.location.pathname + '?' + params.toString() + (window.location.hash || '');
    
    // IMMEDIATE RELOAD with -ai appended (simple and reliable)
    if (window.location.href !== newUrl) {
      window.location.href = newUrl;
    }
  }

  // Intercept form submissions - MAGICALLY add -ai without user seeing it
  function interceptSearchForm() {
    if (!isGoogleSearch()) return;

    // Find all possible search forms
    const searchForms = [
      document.querySelector('form[action="/search"]'),
      document.querySelector('form[role="search"]'),
      document.querySelector('form'),
      ...document.querySelectorAll('form')
    ].filter(Boolean);

    if (searchForms.length === 0) return;

    // Intercept ALL search forms
    searchForms.forEach(searchForm => {
      // Intercept submit event - modify query BEFORE form submits
      searchForm.addEventListener('submit', function(e) {
        if (!extensionEnabled) {
          // If disabled, remove -ai from input if present
          const searchInput = searchForm.querySelector('input[name="q"]') ||
                              searchForm.querySelector('input[type="text"]') ||
                              searchForm.querySelector('textarea[name="q"]') ||
                              searchForm.querySelector('input[aria-label*="Search"]') ||
                              searchForm.querySelector('textarea[aria-label*="Search"]');
          
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
                            searchForm.querySelector('textarea[name="q"]') ||
                            searchForm.querySelector('input[aria-label*="Search"]') ||
                            searchForm.querySelector('textarea[aria-label*="Search"]');
        
        if (searchInput) {
          let query = searchInput.value.trim();
          
          // MAGICALLY append -ai if not already present (user won't see it in input)
          if (query && !query.toLowerCase().endsWith(' -ai') && !query.toLowerCase().endsWith('-ai')) {
            // Modify the value directly - this happens right before submit
            searchInput.value = query + ' -ai';
            // Also update the form data if it exists
            if (searchForm.querySelector('input[type="hidden"][name="q"]')) {
              searchForm.querySelector('input[type="hidden"][name="q"]').value = query + ' -ai';
            }
          }
        }
      }, true); // Use capture phase to intercept early

      // Also intercept Enter key presses in search inputs
      const searchInputs = searchForm.querySelectorAll('input[name="q"], input[type="text"], textarea[name="q"], input[aria-label*="Search"], textarea[aria-label*="Search"]');
      searchInputs.forEach(input => {
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && extensionEnabled) {
            let query = this.value.trim();
            // MAGICALLY append -ai right before Enter submits
            if (query && !query.toLowerCase().endsWith(' -ai') && !query.toLowerCase().endsWith('-ai')) {
              // Use setTimeout to modify after current event cycle
              setTimeout(() => {
                this.value = query + ' -ai';
              }, 0);
            }
          }
        }, true);
      });
    });
  }

  // Handle URL changes (for SPA navigation)
  let lastUrl = window.location.href;
  
  function checkUrlChange() {
    if (isProcessing) return;
    
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl && !hasProcessed) {
      lastUrl = currentUrl;
      hasProcessed = true; // Only process once per URL
      
      // Small delay to let page settle
      setTimeout(() => {
        if (isGoogleSearch() && !isProcessing) {
          loadEnabledState(() => {
            if (extensionEnabled) {
              appendMinusAI();
            } else {
              removeMinusAI();
            }
          });
        }
        hasProcessed = false; // Reset after processing
      }, 200);
    }
  }

  // Monitor URL changes (less aggressive)
  const urlObserver = new MutationObserver(() => {
    // Debounce the check
    clearTimeout(urlObserver.timeout);
    urlObserver.timeout = setTimeout(checkUrlChange, 500);
  });
  
  // Also use popstate for back/forward navigation
  window.addEventListener('popstate', function() {
    hasProcessed = false; // Reset flag on navigation
    setTimeout(() => {
      if (isGoogleSearch() && !isProcessing) {
        loadEnabledState(() => {
          if (extensionEnabled) {
            appendMinusAI();
          } else {
            removeMinusAI();
          }
        });
      }
    }, 200);
  });

  // Initial setup
  function init() {
    if (isGoogleSearch()) {
      loadEnabledState(() => {
        if (extensionEnabled) {
          appendMinusAI();
        } else {
          removeMinusAI();
        }
        interceptSearchForm();
        
        // Start observing (less aggressive)
        if (document.body) {
          urlObserver.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      });
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

