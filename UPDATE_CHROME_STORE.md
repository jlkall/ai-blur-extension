# Updating Extension on Chrome Web Store

## Quick Steps to Publish Latest Version

### 1. Update Version Number

First, bump the version in `manifest.json`:

```json
"version": "0.3.0"  // Increment: 0.3.1, 0.4.0, etc.
```

**Version format:** `MAJOR.MINOR.PATCH`
- **PATCH** (0.3.0 → 0.3.1): Bug fixes, small changes
- **MINOR** (0.3.0 → 0.4.0): New features, improvements
- **MAJOR** (0.3.0 → 1.0.0): Breaking changes

### 2. Package Extension

Run the packaging script:

```bash
chmod +x package-extension.sh
./package-extension.sh
```

Or manually:

```bash
zip -r closeai-extension.zip . \
  -x "*.git*" \
  -x "*.DS_Store" \
  -x "*.md" \
  -x "PUBLISHING.md" \
  -x "UPDATE_CHROME_STORE.md" \
  -x "package-extension.sh" \
  -x ".gitignore" \
  -x "*.zip" \
  -x "*.crx" \
  -x "*.pem" \
  -x "cloudflare-worker/*"
```

This creates `closeai-extension.zip` ready for upload.

### 3. Upload to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Find your **CloseAI** extension
4. Click **"Edit"** (or the extension name)
5. Click **"Package"** tab
6. Click **"Upload new package"**
7. Select `closeai-extension.zip`
8. Click **"Upload"**

### 4. Update Release Notes (Optional but Recommended)

In the **"Store listing"** tab, update the **"What's new"** section:

```
Version 0.3.0 Updates:
• Added cloud detection support (opt-in)
• Improved detection accuracy with optimized models
• Added analytics tracking for performance monitoring
• Enhanced image detection with multi-scale features
• Fixed extension context invalidation errors
• Improved caching for faster detection
```

### 5. Submit for Review

1. Review the changes in the **"Package"** tab
2. Make sure version number matches `manifest.json`
3. Click **"Submit for review"** (or **"Publish"** if it's a minor update)
4. Review typically takes **1-3 business days** (first submission) or **few hours** (updates)

### 6. After Submission

- You'll receive email notifications about review status
- Updates are usually faster than initial submissions
- Users will automatically get the update (if auto-update is enabled)

## Quick Command Reference

```bash
# 1. Update version in manifest.json (manually edit)
# 2. Package extension
./package-extension.sh

# 3. Upload closeai-extension.zip to Chrome Web Store
# 4. Submit for review
```

## Important Notes

- **Version must be higher** than the current published version
- **Don't change version format** (keep it as `X.Y.Z`)
- **Test locally first** by loading the unpacked extension in Chrome
- **Keep release notes updated** so users know what changed
- **Cloudflare Worker files** are excluded from the package (not needed in extension)

## Testing Before Publishing

1. Load extension locally:
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select your extension directory
   - Test all features

2. Verify manifest.json is valid:
   - Check for syntax errors
   - Ensure all referenced files exist
   - Verify permissions are correct

## Troubleshooting

**"Version must be higher" error:**
- Check current version in Chrome Web Store
- Make sure your new version is higher (e.g., if store has 0.2.5, use 0.2.6 or higher)

**"Invalid package" error:**
- Make sure you're uploading a `.zip` file (not `.crx`)
- Check that all required files are included
- Verify `manifest.json` is valid JSON

**"Review rejected" error:**
- Check email for specific reasons
- Common issues: permissions, privacy policy, description clarity
- Fix issues and resubmit

## Current Version Info

- **Current version in repo:** `0.3.0` (check `manifest.json`)
- **Last updated:** Check commit history or Chrome Web Store listing

