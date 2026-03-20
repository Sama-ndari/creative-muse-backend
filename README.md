# Creative Muse Backend

Lightweight Vercel serverless API that proxies AI prompts through [OpenRouter](https://openrouter.ai). Used by **E-Sama** and **Velora** Flutter apps for AI-powered message generation.

## How it works

```
Flutter app  --->  /api/get-muse  --->  OpenRouter  --->  AI Model
             POST {prompt}               (proxy)        Mistral / Llama / Gemma
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
```

## Configuration

All config is in `api/get-muse.js`:

| Constant | Default | Purpose |
|----------|---------|---------|
| `MODELS` | 4 models | Ordered fallback list |
| `MAX_PROMPT_LENGTH` | 2000 | Input truncation limit |
| `MAX_TOKENS` | 500 | Max response tokens |
| `TEMPERATURE` | 0.7 | Creativity level (0-2) |
| `FETCH_TIMEOUT_MS` | 25s | Per-model timeout |

## Project structure

```
api/
  get-muse.js       # Serverless handler (single endpoint)
.env.example        # Required env vars
package.json        # Dependencies
vercel.json         # Routing config
```
