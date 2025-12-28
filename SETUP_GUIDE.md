# CloseAI Cloud Setup Guide

Complete guide to set up the free cloud detection stack.

## Step 1: Set Up Upstash Redis (2 minutes)

1. Go to https://upstash.com
2. Click "Create Database"
3. Choose "Regional" (free tier)
4. Select a region close to you
5. Click "Create"
6. Copy:
   - **REST API URL** (looks like: `https://your-db.upstash.io`)
   - **REST API Token** (click "Show" to reveal)

## Step 2: Set Up Cloudflare Worker (5 minutes)

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```
   - This will open your browser to authorize

3. Navigate to the worker directory:
```bash
cd cloudflare-worker
```

4. Set environment variables:
```bash
# Set Redis URL
wrangler secret put REDIS_URL
# Paste your Upstash Redis REST API URL when prompted

# Set Redis Token
wrangler secret put REDIS_TOKEN
# Paste your Upstash Redis token when prompted
```

5. Deploy the worker:
```bash
npm install
npm run deploy
```

6. Copy your worker URL:
   - After deployment, you'll see: `https://closeai-detection.your-subdomain.workers.dev`
   - Copy this URL!

## Step 3: Update Extension (2 minutes)

1. Open `content.js`
2. Find this line (around line 6):
```javascript
const CLOUD_API_URL = 'https://closeai-detection.your-subdomain.workers.dev';
```

3. Replace with your actual worker URL:
```javascript
const CLOUD_API_URL = 'https://closeai-detection.ACTUAL-URL.workers.dev';
```

4. Save the file

## Step 4: Add Cloud Toggle to Popup

The cloud detection toggle will be added to the popup automatically. Users can opt-in to cloud detection for better accuracy.

## Step 5: Test It!

1. Reload your extension
2. Open the popup
3. Toggle "Cloud Detection" ON
4. Visit a page with AI content
5. Check the console - you should see cloud detection working!

## Free Tier Limits

- **Cloudflare Workers**: 100,000 requests/day
- **Upstash Redis**: 10,000 commands/day

## Troubleshooting

**Worker not deploying?**
- Make sure you're logged in: `wrangler whoami`
- Check your `wrangler.toml` file

**Redis connection errors?**
- Verify your REDIS_URL and REDIS_TOKEN are set correctly
- Check Upstash dashboard to ensure database is active

**Extension not using cloud?**
- Make sure cloud detection toggle is ON in popup
- Check that CLOUD_API_URL is correct in content.js
- Check browser console for errors

## Next Steps

- Monitor usage in Cloudflare dashboard
- Monitor cache hits in Upstash dashboard
- Optimize caching to stay within free tiers
- Consider adding more features (domain-specific models, etc.)

## Cost Breakdown

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Cloudflare Workers | 100k req/day | ~10k/day | **$0** |
| Upstash Redis | 10k commands/day | ~5k/day | **$0** |
| **Total** | | | **$0/month** |

You can handle **thousands of users** for free!



