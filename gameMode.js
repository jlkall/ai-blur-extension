/**
 * Game Mode - User Feedback System
 * Tracks user opinions vs model predictions
 */

// Game mode state
let gameModeEnabled = false;

// Feedback data structure
let feedbackData = {
  total: 0,
  userAgrees: 0,
  userDisagrees: 0,
  modelCorrect: 0,
  modelIncorrect: 0
};

// Load game mode state and feedback data
function loadGameModeState() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['gameMode', 'feedbackData'], (result) => {
      gameModeEnabled = result.gameMode === true;
      if (result.feedbackData) {
        feedbackData = result.feedbackData;
      }
    });
  }
}

// Save feedback data
function saveFeedbackData() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ feedbackData: feedbackData });
  }
}

// Initialize
loadGameModeState();

// Listen for game mode toggle
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleGameMode') {
      gameModeEnabled = message.enabled;
      sendResponse({ success: true });
    } else if (message.action === 'getGameModeStats') {
      sendResponse({ 
        enabled: gameModeEnabled,
        stats: feedbackData 
      });
    }
    return true;
  });
}

/**
 * Add feedback buttons to blurred element
 */
function addFeedbackButtons(element, modelScore, modelConfidence, isImage = false) {
  if (!gameModeEnabled) return;
  if (element.dataset.feedbackAdded === "true") return;
  
  element.dataset.feedbackAdded = "true";
  
  const feedbackContainer = document.createElement("div");
  feedbackContainer.className = "closeai-feedback-container";
  feedbackContainer.style.cssText = `
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 20;
    display: flex;
    gap: 8px;
    pointer-events: auto;
  `;
  
  // Thumbs up button (user thinks it's NOT AI)
  const thumbsUp = document.createElement("button");
  thumbsUp.innerHTML = "👍";
  thumbsUp.title = "I think this is NOT AI-generated";
  thumbsUp.style.cssText = `
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s, background 0.2s;
  `;
  
  thumbsUp.addEventListener("mouseenter", () => {
    thumbsUp.style.transform = "scale(1.1)";
    thumbsUp.style.background = "rgba(76, 175, 80, 0.9)";
  });
  
  thumbsUp.addEventListener("mouseleave", () => {
    thumbsUp.style.transform = "scale(1)";
    thumbsUp.style.background = "rgba(255, 255, 255, 0.9)";
  });
  
  thumbsUp.addEventListener("click", (e) => {
    e.stopPropagation();
    recordFeedback(element, false, modelScore, modelConfidence, isImage);
    thumbsUp.style.background = "rgba(76, 175, 80, 1)";
    thumbsDown.style.opacity = "0.5";
    thumbsUp.disabled = true;
    thumbsDown.disabled = true;
  });
  
  // Thumbs down button (user thinks it IS AI)
  const thumbsDown = document.createElement("button");
  thumbsDown.innerHTML = "👎";
  thumbsDown.title = "I think this IS AI-generated";
  thumbsDown.style.cssText = `
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s, background 0.2s;
  `;
  
  thumbsDown.addEventListener("mouseenter", () => {
    thumbsDown.style.transform = "scale(1.1)";
    thumbsDown.style.background = "rgba(244, 67, 54, 0.9)";
  });
  
  thumbsDown.addEventListener("mouseleave", () => {
    thumbsDown.style.transform = "scale(1)";
    thumbsDown.style.background = "rgba(255, 255, 255, 0.9)";
  });
  
  thumbsDown.addEventListener("click", (e) => {
    e.stopPropagation();
    recordFeedback(element, true, modelScore, modelConfidence, isImage);
    thumbsDown.style.background = "rgba(244, 67, 54, 1)";
    thumbsUp.style.opacity = "0.5";
    thumbsUp.disabled = true;
    thumbsDown.disabled = true;
  });
  
  feedbackContainer.appendChild(thumbsUp);
  feedbackContainer.appendChild(thumbsDown);
  
  // Add to element
  if (isImage) {
    const parent = element.parentElement || element;
    if (parent.style.position !== 'relative') {
      parent.style.position = 'relative';
    }
    parent.appendChild(feedbackContainer);
  } else {
    element.appendChild(feedbackContainer);
  }
}

/**
 * Record user feedback
 */
function recordFeedback(element, userThinksAI, modelScore, modelConfidence, isImage) {
  feedbackData.total++;
  
  // Model thinks it's AI if score >= threshold
  const modelThinksAI = modelScore >= (isImage ? 0.40 : 0.25);
  
  if (userThinksAI) {
    feedbackData.userAgrees++;
    if (modelThinksAI) {
      feedbackData.modelCorrect++;
    } else {
      feedbackData.modelIncorrect++;
    }
  } else {
    feedbackData.userDisagrees++;
    if (!modelThinksAI) {
      feedbackData.modelCorrect++;
    } else {
      feedbackData.modelIncorrect++;
    }
  }
  
  saveFeedbackData();
  
  // Show brief confirmation
  const confirmation = document.createElement("div");
  confirmation.textContent = "Thanks for your feedback!";
  confirmation.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 100;
    pointer-events: none;
  `;
  
  const container = element.parentElement || element;
  container.style.position = 'relative';
  container.appendChild(confirmation);
  
  setTimeout(() => {
    confirmation.style.opacity = "0";
    confirmation.style.transition = "opacity 0.3s";
    setTimeout(() => confirmation.remove(), 300);
  }, 1500);
}

// Export functions
if (typeof window !== 'undefined') {
  window.addFeedbackButtons = addFeedbackButtons;
  window.gameModeEnabled = () => gameModeEnabled;
  
  // Listen for game mode changes
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggleGameMode') {
        gameModeEnabled = message.enabled;
        sendResponse({ success: true });
      }
      return true;
    });
  }
}

