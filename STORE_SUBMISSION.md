# Chrome Web Store Submission Guide

## Quick Start

### 1. Create Icons (Required for Store)

You need 3 icon sizes. Create an `icons/` folder and add:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

**Quick way to create icons:**
- Use any image editor (Photoshop, GIMP, Canva, etc.)
- Design a simple icon (blur effect, AI-themed, etc.)
- Export at the 3 required sizes
- Save as PNG files

Once icons are created, update `manifest.json` to include:
```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

### 2. Package Extension

Run the packaging script:
```bash
./package-extension.sh
```

Or manually:
```bash
zip -r closeai-extension.zip . -x "*.git*" -x "*.DS_Store" -x "*.md" -x "PUBLISHING.md" -x ".gitignore"
```

### 3. Create Developer Account

1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with Google account
3. Pay one-time $5 registration fee
4. Accept Developer Agreement

### 4. Upload & Submit

1. Click **"New Item"** in dashboard
2. Upload `closeai-extension.zip`
3. Fill out store listing (see PUBLISHING.md for details)
4. Submit for review

## Store Listing Template

**Name:** CloseAI

**Short Description:**
```
CloseAI - Detects and blurs AI-generated text and images using advanced ML models. Shows confidence ratings.
```

**Detailed Description:**
```
CloseAI automatically detects and blurs AI-generated content using advanced machine learning models.

KEY FEATURES:
• ML-based text detection (perplexity, burstiness, statistical analysis)
• AI image detection with metadata and visual pattern recognition  
• Confidence ratings displayed on detected content
• Prevents Google AI overviews by appending "-ai" to searches
• 100% local processing - no data sent to servers
• Fast and lightweight with intelligent caching

HOW IT WORKS:
The extension uses an ensemble of detection methods including perplexity analysis, burstiness detection, n-gram patterns, word entropy, image metadata analysis, and visual artifact detection. Simply install and browse - AI-generated content will be automatically detected and blurred with confidence ratings.

PRIVACY:
All processing happens locally in your browser. No data is collected or transmitted to external servers.
```

**Category:** Productivity

**Screenshots:** Take screenshots showing:
- Blurred text with confidence rating
- Blurred images with confidence rating
- Google search with "-ai" appended
- Before/after comparison

**Support URL:** https://github.com/jlkall/ai-blur-extension

## Review Process

- Initial review: 1-3 business days
- Updates: Usually faster (hours to 1 day)
- You'll receive email notifications

## After Approval

Your extension will be live! Users can:
- Install directly from Chrome Web Store
- Rate and review
- You can push updates anytime

## Tips

- **Icons**: Keep it simple and recognizable
- **Screenshots**: Show the extension working on real sites
- **Description**: Be clear and honest about capabilities
- **Updates**: Fix bugs and add features based on user feedback

