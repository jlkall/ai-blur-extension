# Publishing to Chrome Web Store

## Step-by-Step Guide

### 1. Prepare Your Extension

#### A. Update Manifest
- ✅ Manifest is already set up
- Consider adding icons (see below)

#### B. Create Icons (Required)
You need icons in these sizes:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

Create an `icons/` folder and add these. You can use any image editor or online tool.

#### C. Package Your Extension
```bash
# In the extension directory
zip -r ai-blur-extension.zip . -x "*.git*" -x "*.DS_Store" -x "*.md" -x "PUBLISHING.md"
```

Or use Chrome's built-in packer:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Pack extension"
4. Select your extension directory
5. This creates a `.crx` file (but you'll need a `.zip` for the store)

### 2. Create Chrome Web Store Developer Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Pay the one-time $5 registration fee (if you haven't already)
4. Accept the Developer Agreement

### 3. Upload Your Extension

1. In the Developer Dashboard, click **"New Item"**
2. Upload your `.zip` file (not `.crx`)
3. Fill out the store listing (see below)

### 4. Store Listing Information

#### Required Fields:

**Name:** AI Blur - Detect & Blur AI-Generated Content

**Short Description (132 chars max):**
```
Detects and blurs AI-generated text and images using advanced ML models. Shows confidence ratings.
```

**Detailed Description:**
```
AI Blur is a powerful browser extension that automatically detects and blurs AI-generated content using advanced machine learning models.

Features:
• Advanced ML-based text detection using perplexity, burstiness, and statistical analysis
• AI image detection with metadata analysis and visual pattern recognition
• Confidence ratings displayed on detected content
• Automatically prevents Google AI overviews by appending "-ai" to searches
• Works entirely locally - no data sent to servers
• Fast and lightweight with intelligent caching

The extension uses an ensemble of detection methods including:
- Perplexity analysis using DistilGPT2
- Burstiness and sentence variance detection
- N-gram repetition patterns
- Word entropy and frequency analysis
- Image metadata and URL pattern detection
- Visual artifact detection

Simply install and browse - AI-generated content will be automatically detected and blurred with confidence ratings.
```

**Category:** Productivity or Utilities

**Language:** English (United States)

**Privacy Practices:**
- Select "Single purpose" (detects AI content)
- No user data collection
- No external data transmission

**Screenshots (Required):**
- At least 1 screenshot (1280x800 or 640x400)
- Up to 5 screenshots recommended
- Show the extension in action (blurred content with confidence ratings)

**Promotional Images (Optional but recommended):**
- Small promotional tile (440x280)
- Large promotional tile (920x680)
- Marquee promotional tile (1400x560)

**Support URL:** (Optional - can use GitHub repo)
```
https://github.com/jlkall/ai-blur-extension
```

### 5. Privacy & Permissions

Your extension currently has:
- No permissions (good!)
- Only web_accessible_resources for ML models

You may want to add a privacy policy explaining:
- No data collection
- All processing is local
- No external network requests

### 6. Submit for Review

1. Fill out all required fields
2. Click **"Submit for Review"**
3. Review typically takes 1-3 business days
4. You'll receive email notifications about status

### 7. After Approval

- Your extension will be live on the Chrome Web Store
- Users can install it directly
- You can update it by uploading new versions

## Quick Checklist

- [ ] Create icons (16x16, 48x48, 128x128)
- [ ] Update manifest with icons
- [ ] Create screenshots
- [ ] Package extension as .zip
- [ ] Create Chrome Web Store developer account ($5 fee)
- [ ] Upload extension
- [ ] Fill out store listing
- [ ] Submit for review

## Tips

1. **Icons**: Use a simple, recognizable design. Can be AI-themed or blur-themed.
2. **Screenshots**: Show before/after, confidence ratings, different types of content
3. **Description**: Be clear about what it does and why it's useful
4. **Updates**: You can update the extension anytime after publishing

## Resources

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Extension Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)
- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)

