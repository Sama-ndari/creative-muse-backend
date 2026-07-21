import fetch from 'node-fetch';

import { abortAfter, applyCors, validatePremiumKey } from './_shared/muse-utils.js';
import {
  DEFAULT_MODEL,
  OPENAI_URL,
  buildSystemPrompt,
  parseChatRequest,
} from './_shared/me-chat-utils.js';

export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

const FETCH_TIMEOUT_MS = 45_000;

async function callOpenAI(messages, apiKey) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    signal: abortAfter(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[me-chat] OpenAI error ${res.status}: ${text}`);
    return { error: 'AI provider returned an error', status: 502 };
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    return { error: 'Empty response from model', status: 502 };
  }

  return { reply };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = validatePremiumKey(req);
  if (!auth.ok) {
    if (auth.log) {
      console.error(`[me-chat] ${auth.log}`);
    }
    return res.status(auth.status).json({ error: auth.error });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[me-chat] OPENAI_API_KEY is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const parsed = parseChatRequest(req.body);
  if (parsed.error) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  const { message, history } = parsed;
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...history,
    { role: 'user', content: message },
  ];

  const result = await callOpenAI(messages, apiKey);

  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.status(200).json({
    reply: result.reply,
    model: DEFAULT_MODEL,
  });
}
