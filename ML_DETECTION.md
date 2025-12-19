# Robust ML-Based AI Text Detection

This extension now includes a comprehensive ML-based detection system for identifying AI-generated text.

## Features

### 1. **Perplexity-Based Detection**
- Uses DistilGPT2 ONNX model to calculate perplexity scores
- Lower perplexity indicates more predictable (AI-like) text
- Proper tokenization and log-likelihood calculation

### 2. **Burstiness Analysis**
- Measures sentence length variation
- AI text tends to have more uniform sentence lengths
- Calculates coefficient of variation for burstiness score

### 3. **Repetition Detection**
- Analyzes n-gram repetition patterns
- AI text often shows repetitive phrase structures
- Detects 3-gram patterns for optimal accuracy

### 4. **Word Entropy**
- Measures word frequency distribution
- AI text has more uniform word distributions
- Lower entropy indicates more repetitive patterns

### 5. **Punctuation Diversity**
- Analyzes punctuation mark variety
- Human text uses more varied punctuation
- AI text tends to use consistent punctuation patterns

### 6. **Transition Smoothness**
- Calculates bigram transition probabilities
- AI text has smoother word-to-word transitions
- Measures predictability of word sequences

## Ensemble Model

The final detection score combines all features with weighted importance:

- **Perplexity (30%)**: Most important - direct model-based prediction
- **Burstiness (20%)**: Sentence length variation
- **Repetition (15%)**: N-gram repetition patterns
- **Word Entropy (15%)**: Word frequency distribution
- **Punctuation Diversity (10%)**: Punctuation patterns
- **Transition Smoothness (10%)**: Word transition patterns

## Performance

- **Hybrid Approach**: Uses fast statistical features for initial screening, then refines with ML
- **Caching**: Scores are cached to avoid recomputation
- **Async Processing**: ML scoring happens asynchronously to avoid blocking UI
- **Fallback**: Gracefully falls back to statistical features if ML model unavailable

## Usage

The detection system is automatically integrated into the content script. The `detectAIGenerated()` function returns:

```javascript
{
  score: 0.0-1.0,        // AI probability (higher = more AI-like)
  confidence: 0.0-1.0,   // Confidence in the score
  features: {            // Individual feature scores
    perplexity: 0.5,
    burstiness: 0.3,
    repetition: 0.4,
    // ... etc
  }
}
```

## Threshold

The default threshold is `0.25` (25% AI probability). Text scoring above this threshold will be blurred.

## Model Files

- `ml/distilgpt2.onnx`: Pre-trained DistilGPT2 model for perplexity calculation
- `ml/ort.min.js`: ONNX Runtime for model inference
- `ml/tokenizer.json`: Tokenizer vocabulary (optional, uses fallback if unavailable)

