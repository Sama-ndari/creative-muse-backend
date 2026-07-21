import fetch from 'node-fetch';

import {
  TEMPERATURE,
  abortAfter,
  resolvePrompt,
  sleep,
  stripMarkdownFences,
  validatePremiumKey,
} from './_shared/muse-utils.js';

export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const ALLOWED_MODELS = (
  process.env.OPENAI_ALLOWED_MODELS ?? 'gpt-4o-mini,gpt-4o,gpt-4.1-mini,gpt-4.1'
)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const MAX_TOKENS = 2000;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function resolveModel(req) {
  if (!ALLOWED_MODELS.includes(DEFAULT_MODEL)) {
    return {
      error: 'Server misconfiguration',
      status: 500,
      log: 'OPENAI_MODEL is not in OPENAI_ALLOWED_MODELS',
    };
  }

  if (req.method !== 'POST' || req.body?.model === undefined) {
    return { model: DEFAULT_MODEL };
  }

  if (typeof req.body.model !== 'string') {
    return { error: 'model must be a string', status: 400 };
  }

  const model = req.body.model.trim();
  if (!model) {
    return { error: 'model cannot be empty', status: 400 };
  }

  if (!ALLOWED_MODELS.includes(model)) {
    return {
      error: `model must be one of: ${ALLOWED_MODELS.join(', ')}`,
      status: 400,
    };
  }

  return { model };
}

async function callOpenAI(prompt, apiKey, model) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    signal: abortAfter(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    }),
  });

  if (res.status === 429) {
    return { retry: true, status: 429 };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { retry: res.status >= 500, status: res.status, error: text };
  }

  const data = await res.json();
  let content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return { retry: true, status: 200, error: 'Empty response from model' };
  }

  content = stripMarkdownFences(content);
  return { ok: true, muse: content, model };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = validatePremiumKey(req);
  if (!auth.ok) {
    if (auth.log) {
      console.error(`[get-muse-premium] ${auth.log}`);
    }
    return res.status(auth.status).json({ error: auth.error });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[get-muse-premium] OPENAI_API_KEY is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const resolved = resolvePrompt(req);
  if (resolved.error) {
    return res.status(resolved.status).json({ error: resolved.error });
  }

  const modelResolved = resolveModel(req);
  if (modelResolved.error) {
    if (modelResolved.log) {
      console.error(`[get-muse-premium] ${modelResolved.log}`);
    }
    return res.status(modelResolved.status).json({ error: modelResolved.error });
  }
  const { model } = modelResolved;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callOpenAI(resolved.prompt, apiKey, model);

      if (result.ok) {
        return res.status(200).json({
          muse: result.muse,
          model: result.model,
          tier: 'premium',
        });
      }

      if (result.retry && attempt < MAX_RETRIES) {
        console.error(
          `[get-muse-premium] ${model} → ${result.status}, retrying...`,
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      console.error(
        `[get-muse-premium] ${model} failed (${result.status}): ${result.error}`,
      );
      return res.status(502).json({ error: 'AI provider returned an error' });
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error(`[get-muse-premium] ${model} timed out`);
      } else {
        console.error(`[get-muse-premium] exception:`, err.message);
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
    }
  }

  return res.status(503).json({
    error: 'Premium AI service is temporarily unavailable. Please retry shortly.',
  });
}
