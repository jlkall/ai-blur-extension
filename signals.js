const STOPWORDS = new Set([
  "the","is","at","which","on","and","a","an","to","of","in","for","with"
]);

const HEDGING_PHRASES = [
  "it is important to note",
  "in conclusion",
  "generally speaking",
  "overall",
  "as mentioned earlier"
];

function sentenceVarianceScore(text) {
  const sentences = text.split(/[.!?]/).filter(Boolean);
  if (sentences.length < 3) return 0;

  const lengths = sentences.map(s => s.split(/\s+/).length);
  const mean = lengths.reduce((a,b)=>a+b,0) / lengths.length;
  const variance = lengths.reduce((a,b)=>a+(b-mean)**2,0) / lengths.length;

  return clamp(1 - variance / 50);
}

function stopwordDensityScore(text) {
  const words = text.toLowerCase().split(/\s+/);
  const count = words.filter(w => STOPWORDS.has(w)).length;
  return clamp((count / words.length) * 2);
}

function listDensityScore(text) {
  const bullets = (text.match(/[-•]/g) || []).length;
  return clamp(bullets / 5);
}

function hedgingScore(text) {
  const lower = text.toLowerCase();
  const hits = HEDGING_PHRASES.filter(p => lower.includes(p)).length;
  return clamp(hits / 2);
}

function entropyScore(text) {
  const freq = {};
  for (const c of text) freq[c] = (freq[c] || 0) + 1;

  const len = text.length;
  let entropy = 0;

  for (const c in freq) {
    const p = freq[c] / len;
    entropy -= p * Math.log2(p);
  }

  return clamp(1 - entropy / 5);
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}
