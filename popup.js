// Load current state
chrome.storage.local.get(['enabled'], (result) => {
    const enabled = result.enabled !== false; // Default to true
    updateToggle(enabled);
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

