/**
 * Google Search Enhancement
 * Automatically appends "-ai" to search queries to prevent AI overviews
 */

(function() {
  'use strict';

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

  // Modify URL to append -ai
  function appendMinusAI() {
    if (!isGoogleSearch()) return;

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
          appendMinusAI();
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
        appendMinusAI();
      }
    }, 100);
  });

  // Initial setup
  function init() {
    if (isGoogleSearch()) {
      appendMinusAI();
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

