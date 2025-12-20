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

