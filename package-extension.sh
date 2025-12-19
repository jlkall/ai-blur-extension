#!/bin/bash
# Package extension for Chrome Web Store submission

# Create zip file excluding unnecessary files
zip -r closeai-extension.zip . \
  -x "*.git*" \
  -x "*.DS_Store" \
  -x "*.md" \
  -x "PUBLISHING.md" \
  -x "package-extension.sh" \
  -x ".gitignore" \
  -x "*.zip" \
  -x "*.crx" \
  -x "*.pem"

echo "✅ Extension packaged as: closeai-extension.zip"
echo "📦 Ready to upload to Chrome Web Store!"

