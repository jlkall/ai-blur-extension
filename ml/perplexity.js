let session = null;

async function loadModel() {
  if (session) return;

  // Check if chrome.runtime is available
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
    console.warn("[CloseAI] chrome.runtime not available");
    return;
  }

  ort.env.wasm.wasmPaths = chrome.runtime.getURL("ml/");

  session = await ort.InferenceSession.create(
    chrome.runtime.getURL("ml/distilgpt2.onnx")
  );
}

async function computePerplexity(text) {
  await loadModel();

  const tokens = text
    .split(/\s+/)
    .slice(0, 128)
    .map(w => w.length);

  if (tokens.length < 20) return null;

  const input = new ort.Tensor(
    "int64",
    BigInt64Array.from(tokens.map(BigInt)),
    [1, tokens.length]
  );

  const outputs = await session.run({ input_ids: input });
  const logits = outputs.logits.data;

  let score = 0;
  for (let i = 0; i < logits.length; i++) {
    score += Math.abs(logits[i]);
  }

  return score / logits.length;
}
