import fetch from 'node-fetch';

export const config = {
  api: { bodyParser: true },
  maxDuration: 30,
};

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'google/gemma-3-12b-it:free',
];

const MAX_PROMPT_LENGTH = 2000;
const MAX_TOKENS = 500;
const TEMPERATURE = 0.7;
const FETCH_TIMEOUT_MS = 25_000;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_PROMPT =
  'Generate a single, short, and profound creative idea. ' +
  'It could be a poetic thought, a melody idea, a visual prompt for an artist, ' +
  'or a unique story concept. Make it intriguing and concise.';

function abortAfter(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

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
    return { retry: false, status: res.status, error: text };
  }

  const data = await res.json();
  let content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return { retry: false, status: 200, error: 'Empty response from model' };

  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  return { ok: true, muse: content, model };
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

  let prompt = DEFAULT_PROMPT;
  if (req.method === 'POST' && req.body?.prompt) {
    if (typeof req.body.prompt !== 'string') {
      return res.status(400).json({ error: 'prompt must be a string' });
    }
    prompt = req.body.prompt.trim().slice(0, MAX_PROMPT_LENGTH);
    if (!prompt) {
      return res.status(400).json({ error: 'prompt cannot be empty' });
    }
  }

  for (const model of MODELS) {
    try {
      const result = await callModel(model, prompt, apiKey);

      if (result.ok) {
        return res.status(200).json({ muse: result.muse, model: result.model });
      }

      if (result.retry) continue;

      console.error(`[get-muse] ${model} failed (${result.status}): ${result.error}`);
      continue;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error(`[get-muse] ${model} timed out`);
        continue;
      }
      console.error(`[get-muse] ${model} exception:`, err.message);
      continue;
    }
  }

  return res.status(503).json({
    error: 'All AI models are temporarily unavailable. Please retry shortly.',
  });
}
