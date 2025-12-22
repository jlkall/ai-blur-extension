// Available toggles configuration
const AVAILABLE_TOGGLES = [
    {
        id: 'gameMode',
        name: 'Game Mode',
        icon: '🎮',
        description: 'Enable feedback buttons to help improve detection accuracy',
        defaultVisible: true
    },
    {
        id: 'outlineMode',
        name: 'Outline Mode',
        icon: '📦',
        description: 'Draw green outlines around AI content instead of blurring',
        defaultVisible: true
    },
    {
        id: 'showCertainty',
        name: 'Show AI Certainty',
        icon: '🔮',
        description: 'Display confidence percentages on detected content',
        defaultVisible: true
    },
    {
        id: 'nukeMode',
        name: 'Nuke Mode',
        icon: '💥',
        description: 'Remove AI content completely instead of blurring or outlining',
        defaultVisible: true
    }
];

// Load current settings
function loadSettings() {
    chrome.storage.local.get(['toggleVisibility'], (result) => {
        const visibility = result.toggleVisibility || {};
        
        // Only use saved settings - if not set, default to visible (true)
        // Don't initialize undefined values, just treat undefined as visible
        AVAILABLE_TOGGLES.forEach(toggle => {
            // If setting doesn't exist, treat as visible (defaultVisible)
            if (visibility[toggle.id] === undefined) {
                // Don't set it, just use defaultVisible for display
                // This way we only save settings that user explicitly changed
            }
        });
        
        renderToggles(visibility);
    });
}

// Render toggles list
function renderToggles(visibility) {
    const togglesList = document.getElementById('togglesList');
    togglesList.innerHTML = '';
    
    // Create a working copy that includes defaults
    const workingVisibility = {};
    
    AVAILABLE_TOGGLES.forEach(toggle => {
        // If setting exists, use it; otherwise default to visible (true)
        const isVisible = visibility[toggle.id] !== false;
        workingVisibility[toggle.id] = isVisible;
        
        const toggleItem = document.createElement('div');
        toggleItem.className = 'toggle-item';
        toggleItem.innerHTML = `
            <div class="toggle-info">
                <div class="toggle-name">
                    <span class="icon">${toggle.icon}</span>
                    ${toggle.name}
                </div>
                <div class="toggle-description">${toggle.description}</div>
            </div>
            <div class="toggle-switch ${isVisible ? 'active' : ''}" data-toggle-id="${toggle.id}">
                <div class="toggle-slider"></div>
            </div>
        `;
        
        // Add click handler
        const switchElement = toggleItem.querySelector('.toggle-switch');
        switchElement.addEventListener('click', () => {
            const currentState = switchElement.classList.contains('active');
            const newState = !currentState;
            
            if (newState) {
                switchElement.classList.add('active');
            } else {
                switchElement.classList.remove('active');
            }
            
            workingVisibility[toggle.id] = newState;
        });
        
        togglesList.appendChild(toggleItem);
    });
    
    // Store current visibility state for save
    window.currentVisibility = workingVisibility;
}

// Save settings
function saveSettings() {
    if (!window.currentVisibility) {
        alert('No changes to save');
        return;
    }
    
    // Only save settings that are explicitly set to false (hidden)
    // If a toggle is visible (true), don't save it - let it default
    const settingsToSave = {};
    
    AVAILABLE_TOGGLES.forEach(toggle => {
        const isVisible = window.currentVisibility[toggle.id];
        // Only save if explicitly hidden (false)
        // If visible (true), don't save - undefined means visible by default
        if (isVisible === false) {
            settingsToSave[toggle.id] = false;
        }
        // If true, we don't add it to settingsToSave, so it will be undefined (default visible)
    });
    
    chrome.storage.local.set({ toggleVisibility: settingsToSave }, () => {
        // Show success message
        const saveButton = document.getElementById('saveButton');
        const originalText = saveButton.textContent;
        saveButton.textContent = '✅ Saved!';
        saveButton.style.background = '#4CAF50';
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.background = '#4CAF50';
        }, 2000);
        
        // Close settings page and refresh popup if open
        // The popup will reload visibility when it's next opened
        setTimeout(() => {
            window.close();
        }, 500);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveSettings);
    }
});

