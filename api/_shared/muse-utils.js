import { timingSafeEqual } from 'crypto';

export const MAX_PROMPT_LENGTH = 2000;
export const MAX_TOKENS = 500;
export const TEMPERATURE = 0.7;
export const PREMIUM_KEY_HEADER = 'x-premium-key';

export const DEFAULT_PROMPT =
  'Generate a single, short, and profound creative idea. ' +
  'It could be a poetic thought, a melody idea, a visual prompt for an artist, ' +
  'or a unique story concept. Make it intriguing and concise.';

/** Abort fetch after the given timeout in milliseconds. */
export function abortAfter(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** Pause execution for the given duration in milliseconds. */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip markdown code fences from model output. */
export function stripMarkdownFences(content) {
  return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
}

/**
 * Resolve the prompt from GET (default) or POST body.
 * Returns `{ prompt }` or `{ error, status }`.
 */
export function resolvePrompt(req, maxLength = MAX_PROMPT_LENGTH) {
  let prompt = DEFAULT_PROMPT;

  if (req.method === 'POST' && req.body?.prompt) {
    if (typeof req.body.prompt !== 'string') {
      return { error: 'prompt must be a string', status: 400 };
    }

    prompt = req.body.prompt.trim().slice(0, maxLength);
    if (!prompt) {
      return { error: 'prompt cannot be empty', status: 400 };
    }
  }

  return { prompt };
}

function isValidSecret(provided, expected) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Validate the premium API key sent in the request header.
 * Returns `{ ok: true }` or `{ error, status, log? }`.
 */
export function validatePremiumKey(req) {
  const expectedKey = process.env.PREMIUM_API_KEY;
  if (!expectedKey) {
    return {
      error: 'Server misconfiguration',
      status: 500,
      log: 'PREMIUM_API_KEY is not set',
    };
  }

  const providedKey = req.headers[PREMIUM_KEY_HEADER];
  if (!providedKey || typeof providedKey !== 'string') {
    return { error: 'Missing X-Premium-Key header', status: 401 };
  }

  if (!isValidSecret(providedKey, expectedKey)) {
    return { error: 'Invalid premium key', status: 401 };
  }

  return { ok: true };
}
