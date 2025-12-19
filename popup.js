// Load current state
chrome.storage.local.get(['enabled', 'gameMode', 'outlineMode', 'feedbackData'], (result) => {
    const enabled = result.enabled !== false; // Default to true
    updateToggle(enabled);
    
    const gameMode = result.gameMode === true;
    updateGameModeToggle(gameMode);
    
    const outlineMode = result.outlineMode === true;
    updateOutlineModeToggle(outlineMode);
    
    // Load and display stats
    if (result.feedbackData) {
        updateStats(result.feedbackData);
    }
});

// Toggle switch
const toggleSwitch = document.getElementById('toggleSwitch');
const statusText = document.getElementById('statusText');

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

function updateToggle(enabled) {
    if (enabled) {
        toggleSwitch.classList.add('active');
        statusText.textContent = 'Enabled';
    } else {
        toggleSwitch.classList.remove('active');
        statusText.textContent = 'Disabled';
    }
}

// Game mode toggle
const gameModeSwitch = document.getElementById('gameModeSwitch');
const gameModeStatusText = document.getElementById('gameModeStatusText');
const statsContainer = document.getElementById('statsContainer');

gameModeSwitch.addEventListener('click', () => {
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

function updateGameModeToggle(enabled) {
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
    document.getElementById('statTotal').textContent = data.total || 0;
    
    const agreePercent = data.total > 0 
        ? Math.round((data.userAgrees / data.total) * 100) 
        : 0;
    document.getElementById('statAgree').textContent = agreePercent + '%';
    
    const accuracy = data.total > 0
        ? Math.round((data.modelCorrect / data.total) * 100)
        : 0;
    document.getElementById('statAccuracy').textContent = accuracy + '%';
}

// Outline mode toggle
const outlineModeSwitch = document.getElementById('outlineModeSwitch');
const outlineModeStatusText = document.getElementById('outlineModeStatusText');

outlineModeSwitch.addEventListener('click', () => {
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

function updateOutlineModeToggle(enabled) {
    if (enabled) {
        outlineModeSwitch.classList.add('active');
        outlineModeStatusText.textContent = 'Enabled';
    } else {
        outlineModeSwitch.classList.remove('active');
        outlineModeStatusText.textContent = 'Disabled';
    }
}

// Refresh stats periodically when game mode is active
setInterval(() => {
    if (gameModeSwitch.classList.contains('active')) {
        loadStats();
    }
}, 2000);

