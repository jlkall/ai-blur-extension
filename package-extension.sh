#!/bin/bash
# Package extension for Chrome Web Store submission

# Create zip file excluding unnecessary files
zip -r closeai-extension.zip . \
  -x "*.git*" \
  -x "*.DS_Store" \
  -x "*.md" \
  -x "cloudflare-worker/*" \
  -x "package-extension.sh" \
  -x ".gitignore" \
  -x "*.zip" \
  -x "*.crx" \
  -x "*.pem" \
  -x "docs/*"

echo "✅ Extension packaged as: closeai-extension.zip"
echo "📦 Ready to upload to Chrome Web Store!"
echo ""
echo "Next steps:"
echo "1. Update version in manifest.json if needed"
echo "2. Go to: https://chrome.google.com/webstore/devconsole"
echo "3. Find your extension → Edit → Package → Upload new package"
echo "4. Select closeai-extension.zip"
echo "5. Submit for review"

