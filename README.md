# Creative Muse Backend

Lightweight Vercel serverless API that proxies AI prompts through [OpenRouter](https://openrouter.ai). Used by **E-Sama** and **Velora** Flutter apps for AI-powered message generation.

## How it works

```
Flutter app  --->  /api/get-muse          --->  OpenRouter  --->  Free AI models
             --->  /api/get-muse-premium  --->  OpenAI      --->  GPT-4o / GPT-4o-mini
             POST {prompt}
```

The handler tries multiple models with automatic fallback:

| Priority | Model | Cost |
|----------|-------|------|
| 1 | `mistralai/mistral-small-3.1-24b-instruct:free` | Free |
| 2 | `meta-llama/llama-3.3-70b-instruct:free` | Free |
| 3 | `google/gemma-3-27b-it:free` | Free |
| 4 | `mistralai/mistral-nemo` | ~$0.02/1M tokens |

If a free model is rate-limited (429), it falls back to the next one automatically.

## API

### `POST /api/get-muse`

**Request:**

```json
{ "prompt": "Write a professional notification in FR/EN/SW..." }
```

**Response (200):**

```json
{ "muse": "AI-generated text", "model": "mistralai/mistral-nemo" }
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid or empty prompt |
| 405 | Wrong HTTP method |
| 500 | Server misconfiguration (missing API key) |
| 502 | AI provider returned an error |
| 503 | All models temporarily unavailable |

### `GET /api/get-muse`

Returns a random creative idea using the default prompt.

### `POST /api/get-muse-premium`

Same request shape as the free endpoint, but routes through the **OpenAI API** directly for higher-quality responses.

**Required header:**

```
X-Premium-Key: your-secret-premium-key
```

**Request:**

```json
{
  "prompt": "Write a professional notification in FR/EN/SW...",
  "model": "gpt-4o"
}
```

`model` is optional. If omitted, the server uses `OPENAI_MODEL` (default `gpt-4o-mini`). Only models in the server allowlist are accepted.

**Response (200):**

```json
{ "muse": "AI-generated text", "model": "gpt-4o-mini", "tier": "premium" }
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid prompt, empty prompt, or disallowed `model` |
| 401 | Missing or invalid `X-Premium-Key` |
| 405 | Wrong HTTP method |
| 500 | Server misconfiguration (missing `OPENAI_API_KEY` or `PREMIUM_API_KEY`) |
| 502 | OpenAI returned an error |
| 503 | Service temporarily unavailable after retries |

### `GET /api/get-muse-premium`

Returns a random creative idea using the default prompt and default premium model (`OPENAI_MODEL`).

### `POST /api/me-chat`

Personal AI clone chat (multi-turn, RAG context). Same auth as premium.

**Required header:**

```
X-Premium-Key: your-secret-premium-key
```

**Request:**

```json
{
  "message": "What is Ijwi ry'Ikirundi AI?",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! ..." }
  ]
}
```

**Response (200):**

```json
{ "reply": "...", "model": "gpt-4o-mini" }
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid message or history |
| 401 | Missing or invalid `X-Premium-Key` |
| 405 | Wrong HTTP method |
| 500 | Server misconfiguration |
| 502 | OpenAI returned an error |

Knowledge base: edit `api/_shared/me-knowledge.js` by hand (sections + `CUSTOM` block).

**Env:** `OPENAI_API_KEY`, `PREMIUM_API_KEY`.

## Setup

### 1. Clone

```bash
git clone git@github.com:Sama-ndari/creative-muse-backend.git
cd creative-muse-backend
npm install
```

### 2. Environment

Get a free API key at [openrouter.ai/keys](https://openrouter.ai/keys).

Set it in Vercel: **Project Settings > Environment Variables**

```
OPENROUTER_API_KEY=sk-or-v1-xxxx
OPENAI_API_KEY=sk-xxxx
PREMIUM_API_KEY=your-secret-premium-key
```

Optional:

```
OPENAI_MODEL=gpt-4o
OPENAI_ALLOWED_MODELS=gpt-4o-mini,gpt-4o,gpt-4.1-mini,gpt-4.1
```

### 3. Deploy

```bash
npx vercel --prod
```

Or push to GitHub with Vercel Git integration enabled.

### 4. Test

```bash
curl -X POST https://creative-muse-backend.vercel.app/api/get-muse \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello in French and English as JSON"}'

curl -X POST https://creative-muse-backend.vercel.app/api/get-muse-premium \
  -H "Content-Type: application/json" \
  -H "X-Premium-Key: your-secret-premium-key" \
  -d '{"prompt": "Say hello in French and English as JSON", "model": "gpt-4o"}'

curl -X POST https://creative-muse-backend.vercel.app/api/me-chat \
  -H "Content-Type: application/json" \
  -H "X-Premium-Key: your-secret-premium-key" \
  -d '{"message": "What is Ijwi ry'\''Ikirundi AI?", "history": []}'
```

## Configuration

| File | Constant | Default | Purpose |
|------|----------|---------|---------|
| `api/get-muse.js` | `MODELS` | 5 free models | Ordered fallback list |
| `api/get-muse.js` | `FETCH_TIMEOUT_MS` | 8s | Per-model timeout |
| `api/get-muse-premium.js` | `OPENAI_MODEL` | `gpt-4o-mini` | Default model when client omits `model` |
| `api/get-muse-premium.js` | `OPENAI_ALLOWED_MODELS` | 4 GPT models | Allowlist for client `model` override |
| `api/get-muse-premium.js` | `MAX_TOKENS` | 2000 | Max response tokens |
| `api/_shared/muse-utils.js` | `MAX_PROMPT_LENGTH` | 2000 | Input truncation limit |
| `api/_shared/muse-utils.js` | `TEMPERATURE` | 0.7 | Creativity level (0-2) |

## Project structure

```
api/
  _shared/
    muse-utils.js         # Shared prompt parsing and helpers
    me-chat-utils.js      # Personal AI chat helpers
    me-knowledge.js       # Personal AI knowledge (edit by hand)
  get-muse.js             # Free tier (OpenRouter)
  get-muse-premium.js     # Premium tier (OpenAI)
  me-chat.js              # Personal AI clone chat
.env.example              # Required env vars
package.json              # Dependencies
vercel.json               # Routing config
```
