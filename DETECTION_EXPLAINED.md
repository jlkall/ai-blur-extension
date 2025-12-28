# How CloseAI Detection Models Work

## Overview

CloseAI uses a **multi-layered detection system** that combines machine learning models with statistical analysis to identify AI-generated content. The system has three tiers of sophistication, with automatic fallbacks for reliability.

---

## 🎯 Text Detection Models

### Three-Tier Detection System

The text detection uses a **cascading fallback system** that tries the most accurate method first, then falls back if needed:

```
1. Optimized Detector (Best) → 2. Enhanced Detector (GPTZero-level) → 3. Base ML Detector → 4. Statistical Features (Fallback)
```

### Tier 1: Optimized Detector ⚡ (Fastest & Most Accurate)

**Location:** `ml/optimizedDetector.js`

**What it does:**
- Combines 15+ detection features with performance optimizations
- Uses intelligent caching to avoid recomputing scores
- Implements adaptive sampling for speed

**Key Features:**
1. **Perplexity** (22% weight) - Uses DistilGPT2 model to measure how "surprising" the text is
2. **Burstiness** (13% weight) - Measures sentence length variation (AI text is more uniform)
3. **Semantic Coherence** (10% weight) - Checks if sentences flow naturally together
4. **Sentence Perplexity Variance** (11% weight) - AI text has uniform sentence-level perplexity
5. **Lexical Diversity** (9% weight) - Type-Token Ratio (AI uses more repetitive vocabulary)
6. **Cross-Entropy** (8% weight) - How "surprising" text is vs. common English patterns
7. **Syntactic Complexity** (5% weight) - Sentence structure variety
8. **Repetition Patterns** (7% weight) - N-gram repetition detection
9. **Word Entropy** (6% weight) - Word frequency distribution
10. **Transition Smoothness** (4% weight) - Word-to-word transition predictability
11. **Discourse Markers** (2% weight) - Overuse of transition words
12. **Pronoun Patterns** (1% weight) - Pronoun usage patterns
13. **Word Length Variance** (2% weight) - Variation in word lengths

**How it works:**
1. Text is tokenized and analyzed
2. Each feature is calculated (some in parallel for speed)
3. Features are combined using weighted averaging
4. Non-linear scaling is applied for better selectivity
5. Confidence is calculated based on feature agreement

### Tier 2: Enhanced Detector 🚀 (GPTZero-Level Features)

**Location:** `ml/enhancedDetector.js`

**What it does:**
- Implements 8 advanced features similar to GPTZero
- Works entirely locally (no API calls)
- Falls back to base detector if needed

**Key Features:**
1. **Sentence-level Perplexity Variance** - AI text has uniform sentence perplexity
2. **Cross-Entropy Analysis** - Measures "surprise" vs. training distribution
3. **Enhanced Semantic Coherence** - Better sentence-to-sentence flow analysis
4. **Lexical Diversity (Type-Token Ratio)** - Vocabulary variety measurement
5. **Syntactic Complexity** - Sentence structure analysis
6. **Discourse Marker Diversity** - Transition word patterns
7. **Pronoun Usage Patterns** - Pronoun frequency analysis
8. **Word Length Variance** - Variation in word lengths

**How it works:**
- Similar to optimized detector but with different feature weights
- Designed to catch subtle AI patterns that basic models miss

### Tier 3: Base ML Detector 🧠

**Location:** `ml/detector.js`

**What it does:**
- Uses DistilGPT2 ONNX model for perplexity calculation
- Combines 6 core features with ensemble weighting
- Gracefully falls back if model fails to load

**Key Features:**
1. **Perplexity** (30% weight) - Direct model-based prediction using DistilGPT2
2. **Burstiness** (20% weight) - Sentence length variation
3. **Repetition** (15% weight) - N-gram repetition patterns
4. **Word Entropy** (15% weight) - Word frequency distribution
5. **Punctuation Diversity** (10% weight) - Punctuation variety
6. **Transition Smoothness** (10% weight) - Word transition patterns

**How Perplexity Works:**
1. Text is tokenized into word pieces
2. DistilGPT2 model predicts the next token at each position
3. We measure how "surprised" the model is by the actual next token
4. Lower perplexity = more predictable = more AI-like
5. Formula: `perplexity = exp(-average_log_probability)`

### Tier 4: Statistical Features (Fallback) 📊

**Location:** `signals.js`

**What it does:**
- Fast, lightweight statistical analysis
- No ML model required
- Always available as last resort

**Key Features:**
1. **Entropy** (35% weight) - Character frequency randomness
2. **Sentence Variance** (20% weight) - Sentence length variation
3. **Stopword Density** (15% weight) - Common word frequency
4. **List Density** (15% weight) - Bullet point frequency
5. **Hedging** (15% weight) - Overuse of hedging phrases

---

## 🖼️ Image Detection Models

### Three-Tier Detection System

Similar to text detection, image detection uses a cascading system:

```
1. Optimized Image Detector (Best) → 2. Enhanced Image Detector → 3. Base Image Detector
```

### Tier 1: Optimized Image Detector ⚡

**Location:** `ml/optimizedImageDetector.js`

**Key Features:**
1. **Texture Smoothness** (13% weight) - AI images have smoother textures
2. **Gradient Smoothness** (11% weight) - More uniform color gradients
3. **FFT Analysis** (9% weight) - Frequency domain analysis
4. **Advanced Edge Detection** (7% weight) - Canny-like edge analysis
5. **Multi-Scale Features** (5% weight) - Analysis at different resolutions
6. **High-Frequency Content** (9% weight) - Unnatural frequency patterns
7. **Noise Level** (8% weight) - Artificial noise patterns
8. **Local Binary Patterns (LBP)** (7% weight) - Texture pattern analysis
9. **Block Uniformity** (6% weight) - Uniform blocks in AI images
10. **Color Uniformity** (6% weight) - More uniform color distribution
11. **Edge Consistency** (6% weight) - Consistent edge patterns
12. **LAB Color Analysis** (3% weight) - Color space analysis
13. **Metadata Analysis** (5% weight) - URL patterns, context clues

**How it works:**
1. Image is loaded into canvas (with CORS handling)
2. Visual features are extracted (texture, gradients, edges, etc.)
3. Metadata is analyzed (URL, surrounding text, dimensions)
4. Features are combined with weighted averaging
5. Non-linear scaling improves selectivity
6. Confidence is calculated from feature agreement

### Tier 2: Enhanced Image Detector 🚀

**Location:** `ml/enhancedImageDetector.js`

**What it adds:**
- 9 additional advanced features
- FFT analysis for frequency patterns
- Local Binary Patterns for texture
- Multi-scale analysis
- Advanced artifact detection

### Tier 3: Base Image Detector 🧠

**Location:** `ml/imageDetector.js`

**Core Features:**
- 14 visual features (texture, gradients, edges, etc.)
- Metadata extraction (URLs, context, dimensions)
- Smart early returns for high-confidence cases
- Graceful CORS error handling

---

## 🔄 How Detection Works End-to-End

### Text Detection Pipeline

```
1. User visits webpage
   ↓
2. Content script scans text elements (paragraphs, headings, etc.)
   ↓
3. Quick Statistical Check (scoreParagraphSync)
   - Fast, synchronous scoring
   - If score > threshold → blur immediately
   ↓
4. Async ML Refinement (scoreTextAsync)
   - Tries Optimized Detector first
   - Falls back to Enhanced → Base → Statistical
   - Updates blur with refined score
   ↓
5. Optional Cloud Enhancement (if enabled)
   - Sends anonymized features to Cloudflare Worker
   - Combines local + cloud scores (40% local, 60% cloud)
   - Caches results in Upstash Redis
   ↓
6. Final Score Applied
   - Score 0-1 (0 = human, 1 = AI)
   - Confidence 0-1 (how certain we are)
   - If score > threshold (0.55) → blur/outline/remove
```

### Image Detection Pipeline

```
1. Content script scans all images on page
   ↓
2. Metadata Check (Fast, No Processing)
   - Check URL for AI generator patterns
   - Check surrounding text/context
   - If high confidence → return early
   ↓
3. Visual Feature Extraction
   - Load image into canvas
   - Extract texture, gradient, edge features
   - Handle CORS errors gracefully
   ↓
4. Scoring
   - Tries Optimized Image Detector first
   - Falls back to Enhanced → Base
   - Combines visual + metadata scores
   ↓
5. Apply Effect
   - If score > threshold (0.40) → blur/outline/remove
```

---

## ☁️ Cloud Detection Integration

### How It Works

When **Cloud Detection** is enabled:

1. **Local Detection First**
   - Extension runs local detection as normal
   - Gets a score and confidence

2. **Cloud Enhancement (if confidence < 75%)**
   - Only sends **anonymized features** (no text content)
   - Sends SHA-256 hash of text for caching
   - Cloudflare Worker checks Upstash Redis cache
   - If cached → returns immediately
   - If not cached → runs detection, caches result

3. **Score Combination**
   - Local score: 40% weight
   - Cloud score: 60% weight
   - Combined confidence: weighted average

4. **Privacy-Preserving**
   - No full text sent to cloud
   - Only statistical features (entropy, variance, etc.)
   - Hash-based caching prevents duplicate processing

---

## 📊 Scoring & Thresholds

### Text Detection
- **Threshold:** 0.55 (55% AI likelihood)
- **Score Range:** 0.0 (human) to 1.0 (AI)
- **Confidence Range:** 0.0 (uncertain) to 1.0 (certain)

### Image Detection
- **Threshold:** 0.40 (40% AI likelihood)
- **Score Range:** 0.0 (human) to 1.0 (AI)
- **Confidence Range:** 0.0 (uncertain) to 1.0 (certain)

### Why Different Thresholds?

- **Images:** Lower threshold because visual features are more reliable indicators
- **Text:** Higher threshold to reduce false positives on legitimate content

---

## 🎯 Key Detection Principles

### What Makes AI Text Detectable?

1. **Uniformity** - AI text is more consistent (sentence lengths, word choices)
2. **Predictability** - Lower perplexity (model is less "surprised")
3. **Repetition** - More repetitive n-grams and phrases
4. **Vocabulary** - Less diverse word usage (lower Type-Token Ratio)
5. **Structure** - More formulaic sentence structures
6. **Transitions** - Overuse of discourse markers ("however", "therefore", etc.)

### What Makes AI Images Detectable?

1. **Texture Smoothness** - AI generators create smoother textures
2. **Gradient Uniformity** - More uniform color gradients
3. **Frequency Patterns** - Unnatural patterns in frequency domain
4. **Edge Consistency** - More consistent edge patterns
5. **Artifacts** - Specific pixel-level artifacts
6. **Metadata** - URLs from known AI generators

---

## ⚡ Performance Optimizations

### Caching
- **Text:** Content-based hashing caches scores
- **Images:** URL-based caching (first 100 chars)
- **Cloud:** Redis caching with 1-hour TTL

### Speed Improvements
- **Adaptive Sampling:** Only analyzes subset of long texts
- **Early Returns:** High-confidence metadata checks skip visual analysis
- **Parallel Processing:** Some features calculated simultaneously
- **Lazy Loading:** ML models only loaded when needed

### Fallback System
- If ML model fails → Enhanced detector
- If Enhanced fails → Base detector
- If Base fails → Statistical features
- Always has a working detection method

---

## 🔬 Technical Details

### Perplexity Calculation

```javascript
// 1. Tokenize text
tokens = tokenize(text)

// 2. For each position, predict next token
for each position i:
  logits = model.predict(tokens[0..i])
  prob = softmax(logits)[tokens[i+1]]
  logProb += log(prob)

// 3. Calculate perplexity
perplexity = exp(-average_log_probability)
```

**Lower perplexity = More AI-like**

### Ensemble Scoring

```javascript
// Weighted combination
score = Σ(weight_i × feature_i)

// Non-linear scaling
finalScore = pow(score, 1.15)

// Confidence from feature agreement
confidence = 1 - variance(features)
```

### Feature Normalization

All features are normalized to 0-1 range:
- `0.0` = Human-like
- `1.0` = AI-like

---

## 📈 Accuracy Improvements Over Time

The system has evolved through multiple iterations:

1. **v1.0:** Basic statistical features only
2. **v2.0:** Added DistilGPT2 perplexity model
3. **v3.0:** Enhanced detector with GPTZero-level features
4. **v4.0:** Optimized detector with speed + accuracy improvements
5. **v5.0:** Cloud detection for enhanced accuracy

Each version improved both accuracy and speed while maintaining privacy.

---

## 🛡️ Privacy & Security

- **Local-First:** All detection runs in your browser
- **No Content Sent:** Cloud detection only sends anonymized features
- **Hash-Based:** Text is hashed (SHA-256) before cloud requests
- **Opt-In Cloud:** Cloud detection is disabled by default
- **No Tracking:** Analytics only track aggregated metrics, no content

---

This multi-layered approach ensures CloseAI can detect AI content accurately while maintaining privacy and performance! 🚀



