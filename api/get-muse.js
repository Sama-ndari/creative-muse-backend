import fetch from 'node-fetch';

import {
  MAX_TOKENS,
  TEMPERATURE,
  abortAfter,
  resolvePrompt,
  sleep,
  stripMarkdownFences,
} from './_shared/muse-utils.js';

export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

const MODELS = [
  'nvidia/nemotron-nano-9b-v2:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
  'openai/gpt-oss-20b:free',
];

const FETCH_TIMEOUT_MS = 8_000;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function callModel(model, prompt, apiKey) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    signal: abortAfter(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://creative-muse-backend.vercel.app',
      'X-Title': 'Creative Muse API',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    }),
  });

  if (res.status === 429) return { retry: true, status: 429 };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { retry: true, status: res.status, error: text };
  }

  const data = await res.json();
  let content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return { retry: true, status: 200, error: 'Empty response from model' };

  content = stripMarkdownFences(content);

  return { ok: true, muse: content, model };
}

async function tryAllModels(prompt, apiKey) {
  for (const model of MODELS) {
    try {
      const result = await callModel(model, prompt, apiKey);

      if (result.ok) return result;
      if (result.retry) {
        console.error(`[get-muse] ${model} → ${result.status}, trying next`);
        continue;
      }

      console.error(`[get-muse] ${model} failed (${result.status}): ${result.error}`);
      continue;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error(`[get-muse] ${model} timed out`);
      } else {
        console.error(`[get-muse] ${model} exception:`, err.message);
      }
      continue;
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[get-muse] OPENROUTER_API_KEY is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const resolved = resolvePrompt(req);
  if (resolved.error) {
    return res.status(resolved.status).json({ error: resolved.error });
  }
  const { prompt } = resolved;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await tryAllModels(prompt, apiKey);

    if (result?.ok) {
      return res.status(200).json({ muse: result.muse, model: result.model });
    }

    if (attempt < MAX_RETRIES) {
      console.error(`[get-muse] Attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  return res.status(503).json({
    error: 'All AI models are temporarily unavailable. Please retry shortly.',
  });
}
