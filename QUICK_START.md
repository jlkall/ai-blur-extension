# 🚀 Quick Start: Free Cloud Detection Setup

Follow these steps to set up your free cloud detection stack (takes ~10 minutes).

## Step 1: Upstash Redis (2 min)

1. Go to https://upstash.com
2. Sign up (free)
3. Click "Create Database"
4. Choose "Regional" (free tier)
5. Select region (closest to you)
6. Click "Create"
7. **Copy these two things:**
   - REST API URL (looks like: `https://your-db-1234.upstash.io`)
   - REST API Token (click "Show" to reveal)

## Step 2: Cloudflare Worker (5 min)

1. **Install Wrangler:**
```bash
npm install -g wrangler
```

2. **Login to Cloudflare:**
```bash
wrangler login
```
   - This opens your browser - authorize it

3. **Go to worker directory:**
```bash
cd cloudflare-worker
```

4. **Set secrets:**
```bash
# Set Redis URL
wrangler secret put REDIS_URL
# Paste your Upstash REST API URL when prompted

# Set Redis Token  
wrangler secret put REDIS_TOKEN
# Paste your Upstash token when prompted
```

5. **Deploy:**
```bash
npm install
npm run deploy
```

6. **Copy your worker URL:**
   - After deploy, you'll see: `https://closeai-detection.YOUR-SUBDOMAIN.workers.dev`
   - **COPY THIS URL!**

## Step 3: Update Extension (1 min)

1. Open `content.js`
2. Find line 6 (around there):
```javascript
const CLOUD_API_URL = 'https://closeai-detection.YOUR-SUBDOMAIN.workers.dev';
```

3. Replace with your actual URL:
```javascript
const CLOUD_API_URL = 'https://closeai-detection.ACTUAL-URL.workers.dev';
```

4. Save!

## Step 4: Test! (2 min)

1. Reload your extension in Chrome
2. Open extension popup
3. Toggle "☁️ Cloud Detection" ON
4. Visit a page with AI content
5. Check browser console - should see cloud detection working!

## ✅ Done!

You now have:
- ✅ Free cloud detection API (100k requests/day)
- ✅ Free caching (10k commands/day)  
- ✅ Privacy-preserving (no full text sent)
- ✅ **Total cost: $0/month**

## Troubleshooting

**Worker won't deploy?**
- Make sure you're logged in: `wrangler whoami`
- Check `wrangler.toml` exists

**Redis errors?**
- Verify REDIS_URL and REDIS_TOKEN are set: `wrangler secret list`
- Check Upstash dashboard - database should be "Active"

**Extension not using cloud?**
- Make sure cloud toggle is ON in popup
- Check CLOUD_API_URL is correct in content.js
- Check browser console for errors

## Next Steps

- Monitor usage in Cloudflare dashboard
- Monitor cache hits in Upstash dashboard  
- Optimize to stay within free tiers
- Add more features as needed!

