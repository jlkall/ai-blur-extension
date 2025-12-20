// Get all DOM elements first
const toggleSwitch = document.getElementById('toggleSwitch');
const statusText = document.getElementById('statusText');
const gameModeSwitch = document.getElementById('gameModeSwitch');
const gameModeStatusText = document.getElementById('gameModeStatusText');
const statsContainer = document.getElementById('statsContainer');
const outlineModeSwitch = document.getElementById('outlineModeSwitch');
const outlineModeStatusText = document.getElementById('outlineModeStatusText');
const certaintySwitch = document.getElementById('certaintySwitch');
const certaintyStatusText = document.getElementById('certaintyStatusText');

// Load current state
chrome.storage.local.get(['enabled', 'gameMode', 'outlineMode', 'showCertainty', 'feedbackData'], (result) => {
    const enabled = result.enabled !== false; // Default to true
    updateToggle(enabled);
    
    const gameMode = result.gameMode === true;
    updateGameModeToggle(gameMode);
    
    const outlineMode = result.outlineMode === true;
    updateOutlineModeToggle(outlineMode);
    
    const showCertainty = result.showCertainty === true;
    updateCertaintyToggle(showCertainty);
    
    // Set initial disabled state for other toggles
    enableOtherToggles(enabled);
    
    // Load and display stats
    if (result.feedbackData) {
        updateStats(result.feedbackData);
    }
});

if (toggleSwitch) {
    toggleSwitch.addEventListener('click', () => {
    chrome.storage.local.get(['enabled'], (result) => {
        const currentState = result.enabled !== false; // Default to true
        const newState = !currentState;
        
        chrome.storage.local.set({ enabled: newState }, () => {
            updateToggle(newState);
            
            // Reload current tab to apply changes
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        });
    });
    });
}

function updateToggle(enabled) {
    if (!toggleSwitch || !statusText) return;
    
    if (enabled) {
        toggleSwitch.classList.add('active');
        statusText.textContent = 'Enabled';
        // Enable all other toggles
        enableOtherToggles(true);
    } else {
        toggleSwitch.classList.remove('active');
        statusText.textContent = 'Disabled';
        // Disable all other toggles
        enableOtherToggles(false);
    }
}

function enableOtherToggles(enabled) {
    if (!gameModeSwitch || !outlineModeSwitch || !certaintySwitch) return;
    
    const gameModeContainer = gameModeSwitch.closest('.toggle-container');
    const outlineModeContainer = outlineModeSwitch.closest('.toggle-container');
    const certaintyContainer = certaintySwitch.closest('.toggle-container');
    
    if (!gameModeContainer || !outlineModeContainer || !certaintyContainer) return;
    
    if (enabled) {
        gameModeContainer.classList.remove('disabled');
        gameModeSwitch.classList.remove('disabled');
        outlineModeContainer.classList.remove('disabled');
        outlineModeSwitch.classList.remove('disabled');
        certaintyContainer.classList.remove('disabled');
        certaintySwitch.classList.remove('disabled');
    } else {
        gameModeContainer.classList.add('disabled');
        gameModeSwitch.classList.add('disabled');
        outlineModeContainer.classList.add('disabled');
        outlineModeSwitch.classList.add('disabled');
        certaintyContainer.classList.add('disabled');
        certaintySwitch.classList.add('disabled');
    }
}

// Game mode toggle
if (gameModeSwitch) {
    gameModeSwitch.addEventListener('click', () => {
    // Check if main toggle is enabled
    chrome.storage.local.get(['enabled'], (result) => {
        if (result.enabled === false) {
            return; // Don't allow if main toggle is off
        }
        
        chrome.storage.local.get(['gameMode'], (result) => {
            const currentState = result.gameMode === true;
            const newState = !currentState;
            
            chrome.storage.local.set({ gameMode: newState }, () => {
                updateGameModeToggle(newState);
                
                // Notify content script
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'toggleGameMode',
                            enabled: newState
                        }).catch(() => {
                            // Tab might not have content script loaded yet
                        });
                    }
                });
                
                // Reload to apply game mode
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });
            });
        });
    });
    });
}

function updateGameModeToggle(enabled) {
    if (!gameModeSwitch || !gameModeStatusText || !statsContainer) return;
    if (enabled) {
        gameModeSwitch.classList.add('active');
        gameModeStatusText.textContent = 'Enabled';
        statsContainer.classList.add('active');
        loadStats();
    } else {
        gameModeSwitch.classList.remove('active');
        gameModeStatusText.textContent = 'Disabled';
        statsContainer.classList.remove('active');
    }
}

function loadStats() {
    chrome.storage.local.get(['feedbackData'], (result) => {
        if (result.feedbackData) {
            updateStats(result.feedbackData);
        }
    });
}

function updateStats(data) {
    const statTotal = document.getElementById('statTotal');
    const statAgree = document.getElementById('statAgree');
    const statAccuracy = document.getElementById('statAccuracy');
    
    if (!statTotal || !statAgree || !statAccuracy) return;
    
    statTotal.textContent = data.total || 0;
    
    const agreePercent = data.total > 0 
        ? Math.round((data.userAgrees / data.total) * 100) 
        : 0;
    statAgree.textContent = agreePercent + '%';
    
    const accuracy = data.total > 0
        ? Math.round((data.modelCorrect / data.total) * 100)
        : 0;
    statAccuracy.textContent = accuracy + '%';
}

// Outline mode toggle
if (outlineModeSwitch) {
    outlineModeSwitch.addEventListener('click', () => {
    // Check if main toggle is enabled
    chrome.storage.local.get(['enabled'], (result) => {
        if (result.enabled === false) {
            return; // Don't allow if main toggle is off
        }
        
        chrome.storage.local.get(['outlineMode'], (result) => {
            const currentState = result.outlineMode === true;
            const newState = !currentState;
            
            chrome.storage.local.set({ outlineMode: newState }, () => {
                updateOutlineModeToggle(newState);
                
                // Notify content script
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'toggleOutlineMode',
                            enabled: newState
                        }).catch(() => {
                            // Tab might not have content script loaded yet
                        });
                    }
                });
                
                // Reload current tab to apply changes
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });
            });
        });
    });
    });
}

function updateOutlineModeToggle(enabled) {
    if (!outlineModeSwitch || !outlineModeStatusText) return;
    if (enabled) {
        outlineModeSwitch.classList.add('active');
        outlineModeStatusText.textContent = 'Enabled';
    } else {
        outlineModeSwitch.classList.remove('active');
        outlineModeStatusText.textContent = 'Disabled';
    }
}

// Show AI Certainty toggle
if (certaintySwitch) {
    certaintySwitch.addEventListener('click', () => {
    // Check if main toggle is enabled
    chrome.storage.local.get(['enabled'], (result) => {
        if (result.enabled === false) {
            return; // Don't allow if main toggle is off
        }
        
        chrome.storage.local.get(['showCertainty'], (result) => {
            const currentState = result.showCertainty === true;
            const newState = !currentState;
            
            chrome.storage.local.set({ showCertainty: newState }, () => {
                updateCertaintyToggle(newState);
                
                // Notify content script
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'toggleCertainty',
                            enabled: newState
                        }).catch(() => {
                            // Tab might not have content script loaded yet
                        });
                    }
                });
                
                // Reload current tab to apply changes
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });
            });
        });
    });
    });
}

function updateCertaintyToggle(enabled) {
    if (!certaintySwitch || !certaintyStatusText) return;
    if (enabled) {
        certaintySwitch.classList.add('active');
        certaintyStatusText.textContent = 'Enabled';
    } else {
        certaintySwitch.classList.remove('active');
        certaintyStatusText.textContent = 'Disabled';
    }
}

// Refresh stats periodically when game mode is active
setInterval(() => {
    if (gameModeSwitch && gameModeSwitch.classList.contains('active')) {
        loadStats();
    }
}, 2000);

// ===== Detection History & Export =====

// Load and display detection history stats
function loadHistoryStats() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getHistory' }, (response) => {
            if (chrome.runtime.lastError) {
                // Content script might not be loaded, try direct storage access
                chrome.storage.local.get(['detectionHistory'], (result) => {
                    const history = result.detectionHistory || [];
                    updateHistoryStats(history);
                });
            } else if (response && response.history) {
                updateHistoryStats(response.history);
            }
        });
    });
}

function updateHistoryStats(history) {
    const total = history.length;
    const text = history.filter(h => h.type === 'text').length;
    const images = history.filter(h => h.type === 'image').length;
    
    let avgCertainty = 0;
    if (total > 0) {
        const sum = history.reduce((acc, h) => acc + (h.certainty || 0), 0);
        avgCertainty = Math.round((sum / total) * 100);
    }
    
    const totalEl = document.getElementById('historyTotal');
    const textEl = document.getElementById('historyText');
    const imagesEl = document.getElementById('historyImages');
    const avgEl = document.getElementById('historyAvg');
    
    if (totalEl) totalEl.textContent = total;
    if (textEl) textEl.textContent = text;
    if (imagesEl) imagesEl.textContent = images;
    if (avgEl) avgEl.textContent = avgCertainty + '%';
}

// Export functions
function exportHistory(format) {
    chrome.storage.local.get(['detectionHistory'], (result) => {
        const history = result.detectionHistory || [];
        
        if (history.length === 0) {
            alert('No detection history to export.');
            return;
        }
        
        // Inject export script into current page context
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) return;
            
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (historyData, format) => {
                    if (format === 'csv') {
                        if (typeof window.closeaiExport !== 'undefined') {
                            window.closeaiExport.exportAsCSV(historyData);
                        } else {
                            // Fallback CSV export
                            const headers = ['Timestamp', 'Type', 'Score', 'Confidence', 'Certainty', 'Domain', 'URL'];
                            const rows = [headers.join(',')];
                            historyData.forEach(d => {
                                rows.push([
                                    `"${d.timestamp}"`,
                                    `"${d.type}"`,
                                    d.score,
                                    d.confidence !== null ? d.confidence : '',
                                    d.certainty,
                                    `"${d.domain}"`,
                                    `"${d.url}"`
                                ].join(','));
                            });
                            const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'closeai-detections.csv';
                            a.click();
                            URL.revokeObjectURL(url);
                        }
                    } else {
                        if (typeof window.closeaiExport !== 'undefined') {
                            window.closeaiExport.exportAsJSON(historyData);
                        } else {
                            // Fallback JSON export
                            const blob = new Blob([JSON.stringify(historyData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'closeai-detections.json';
                            a.click();
                            URL.revokeObjectURL(url);
                        }
                    }
                },
                args: [history, format]
            });
        });
    });
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear all detection history? This cannot be undone.')) {
        chrome.storage.local.set({ detectionHistory: [] }, () => {
            updateHistoryStats([]);
            alert('Detection history cleared.');
        });
    }
}

// ===== Per-Site Controls =====

function loadCurrentSite() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url) {
            document.getElementById('currentSite').textContent = 'Not available';
            return;
        }
        
        try {
            const url = new URL(tabs[0].url);
            const domain = url.hostname.replace(/^www\./, '');
            document.getElementById('currentSite').textContent = domain;
            
            // Load site settings
            chrome.storage.local.get(['siteSettings'], (result) => {
                const settings = result.siteSettings || {};
                const siteSettings = settings[domain] || {};
                
                const whitelistBtn = document.getElementById('whitelistBtn');
                const blacklistBtn = document.getElementById('blacklistBtn');
                const removeBtn = document.getElementById('removeSiteBtn');
                
                if (siteSettings.whitelisted) {
                    whitelistBtn.style.background = 'rgba(76, 175, 80, 0.3)';
                    whitelistBtn.textContent = '✓ Whitelisted';
                } else {
                    whitelistBtn.style.background = '';
                    whitelistBtn.textContent = 'Whitelist';
                }
                
                if (siteSettings.blacklisted) {
                    blacklistBtn.style.background = 'rgba(244, 67, 54, 0.3)';
                    blacklistBtn.textContent = '✓ Blacklisted';
                } else {
                    blacklistBtn.style.background = '';
                    blacklistBtn.textContent = 'Blacklist';
                }
            });
        } catch (e) {
            document.getElementById('currentSite').textContent = 'Invalid URL';
        }
    });
}

function setSiteSetting(setting, value) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url) return;
        
        try {
            const url = new URL(tabs[0].url);
            const domain = url.hostname.replace(/^www\./, '');
            
            chrome.storage.local.get(['siteSettings'], (result) => {
                const settings = result.siteSettings || {};
                if (!settings[domain]) {
                    settings[domain] = {};
                }
                
                if (setting === 'remove') {
                    delete settings[domain];
                } else {
                    // Clear opposite setting
                    if (setting === 'whitelisted') {
                        settings[domain].blacklisted = false;
                    } else if (setting === 'blacklisted') {
                        settings[domain].whitelisted = false;
                    }
                    settings[domain][setting] = value;
                }
                
                chrome.storage.local.set({ siteSettings: settings }, () => {
                    loadCurrentSite();
                    // Reload tab to apply changes
                    chrome.tabs.reload(tabs[0].id);
                });
            });
        } catch (e) {
            console.error('Error setting site setting:', e);
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load history stats
    loadHistoryStats();
    setInterval(loadHistoryStats, 5000); // Refresh every 5 seconds
    
    // Load current site
    loadCurrentSite();
    
    // Export buttons
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', () => exportHistory('csv'));
    }
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', () => exportHistory('json'));
    }
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    // Site control buttons
    const whitelistBtn = document.getElementById('whitelistBtn');
    const blacklistBtn = document.getElementById('blacklistBtn');
    const removeSiteBtn = document.getElementById('removeSiteBtn');
    
    if (whitelistBtn) {
        whitelistBtn.addEventListener('click', () => {
            chrome.storage.local.get(['siteSettings'], (result) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (!tabs[0] || !tabs[0].url) return;
                    const url = new URL(tabs[0].url);
                    const domain = url.hostname.replace(/^www\./, '');
                    const settings = result.siteSettings || {};
                    const isWhitelisted = settings[domain] && settings[domain].whitelisted;
                    setSiteSetting('whitelisted', !isWhitelisted);
                });
            });
        });
    }
    
    if (blacklistBtn) {
        blacklistBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0] || !tabs[0].url) return;
                const url = new URL(tabs[0].url);
                const domain = url.hostname.replace(/^www\./, '');
                chrome.storage.local.get(['siteSettings'], (result) => {
                    const settings = result.siteSettings || {};
                    const isBlacklisted = settings[domain] && settings[domain].blacklisted;
                    setSiteSetting('blacklisted', !isBlacklisted);
                });
            });
        });
    }
    
    if (removeSiteBtn) {
        removeSiteBtn.addEventListener('click', () => setSiteSetting('remove', false));
    }
});

