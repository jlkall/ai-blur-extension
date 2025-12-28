# Privacy Practices Justifications for Chrome Web Store

## Required Justifications for Permissions

Copy and paste these justifications into the "Privacy practices" tab in the Chrome Web Store Developer Dashboard.

---

### 1. Scripting Permission

**Justification:**

```
The scripting permission is required to inject content scripts that scan web pages for AI-generated content. These scripts analyze text and images on the page using local machine learning models to detect AI-generated content. The extension needs to run detection algorithms on page content to identify and blur AI-generated text and images. All processing happens locally in the user's browser - no content is sent to external servers.
```

---

### 2. Storage Permission

**Justification:**

```
The storage permission is required to save user preferences and settings locally in the browser. This includes: whether the extension is enabled/disabled, blur/outline/nuke mode preferences, cloud detection toggle, and detection history. All data is stored locally using chrome.storage.local API - no data is transmitted to external servers. This allows the extension to remember user preferences across browser sessions and provide a personalized experience.
```

---

### 3. Tabs Permission

**Justification:**

```
The tabs permission is required to communicate with content scripts running in browser tabs and to reload pages when user settings change. The extension needs to send messages to active tabs to update detection settings (enable/disable, toggle modes) and to reload pages when preferences are modified so that changes take effect immediately. The extension only accesses tabs that the user has open and does not collect or transmit any tab data to external servers.
```

---

## Additional Privacy Information

### Single Purpose
**Purpose:** Detects and blurs AI-generated content on web pages

### Data Collection
- **No user data collected**
- **No personal information transmitted**
- **All processing is local**
- **Optional cloud detection** (opt-in) only sends anonymized statistical features, not content

### Privacy Policy (if you have one)
You can reference your GitHub repository's privacy policy or create a simple privacy page explaining:
- No data collection
- Local-only processing
- Optional cloud detection is opt-in and privacy-preserving

---

## Quick Copy-Paste (All Three Together)

If you need to paste all three at once, here they are:

**Scripting:**
```
The scripting permission is required to inject content scripts that scan web pages for AI-generated content. These scripts analyze text and images on the page using local machine learning models to detect AI-generated content. The extension needs to run detection algorithms on page content to identify and blur AI-generated text and images. All processing happens locally in the user's browser - no content is sent to external servers.
```

**Storage:**
```
The storage permission is required to save user preferences and settings locally in the browser. This includes: whether the extension is enabled/disabled, blur/outline/nuke mode preferences, cloud detection toggle, and detection history. All data is stored locally using chrome.storage.local API - no data is transmitted to external servers. This allows the extension to remember user preferences across browser sessions and provide a personalized experience.
```

**Tabs:**
```
The tabs permission is required to communicate with content scripts running in browser tabs and to reload pages when user settings change. The extension needs to send messages to active tabs to update detection settings (enable/disable, toggle modes) and to reload pages when preferences are modified so that changes take effect immediately. The extension only accesses tabs that the user has open and does not collect or transmit any tab data to external servers.
```

