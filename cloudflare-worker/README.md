# CloseAI Cloudflare Worker

Free cloud detection API for CloseAI extension.

## Setup

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Set up Upstash Redis:
   - Go to https://upstash.com
   - Create a free database
   - Copy the REST API URL and token

4. Set environment variables:
```bash
wrangler secret put REDIS_URL
# Paste your Upstash Redis REST API URL

wrangler secret put REDIS_TOKEN
# Paste your Upstash Redis token
```

5. Deploy:
```bash
npm run deploy
```

## Free Tier Limits

- **Cloudflare Workers**: 100,000 requests/day
- **Upstash Redis**: 10,000 commands/day

## API Endpoint

After deployment, you'll get a URL like:
`https://closeai-detection.your-subdomain.workers.dev`

## Usage

POST to the endpoint with:
```json
{
  "hash": "abc123...",
  "features": {
    "entropy": 3.5,
    "avgSentenceLength": 15,
    "wordDiversity": 0.7,
    ...
  },
  "metadata": {
    "length": 150,
    "language": "en"
  }
}
```

Response:
```json
{
  "score": 0.65,
  "confidence": 0.8,
  "source": "cloud",
  "modelVersion": "1.0"
}
```

