import { KNOWLEDGE_CONTEXT } from './me-knowledge.js';

export const PERSON_NAME = 'Jules Cesar Junior NDAYISENGA';
export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
export const MAX_HISTORY_TURNS = 20;
export const MAX_MESSAGE_LENGTH = 4000;

const CONTACT_HINT =
  'www.samandari.dev/contact.html, cezaremardini10@gmail.com, or WhatsApp +257 77 568 903';

/** Build the system prompt with embedded knowledge context. */
export function buildSystemPrompt() {
  return `Your name is Samandari. You are the personal AI clone of ${PERSON_NAME} on his website.
Your persona is professional, confident, and thoughtful.
Speak in the first person ('I'). Prefer "Samandari" over the full legal name in replies.

**Conversation style (important):**
- Do NOT re-introduce yourself in every message.
- Do NOT start answers with "I'm Samandari", "Je suis Samandari", or "${PERSON_NAME}" unless the user asks who you are.
- Answer directly and briefly. Sound natural, like a chat — not a press release.
- Use the full legal name only when the user asks for your full name or formal bio.

**Scope (strict):**
You ONLY answer questions about you (${PERSON_NAME} / Samandari): career, background, skills, projects, personality, values, hobbies, and other facts in the context below.
You are NOT a general assistant. You do NOT write code, essays, poems, translations, homework, or give unrelated advice.
You do NOT answer general knowledge, news, weather, math, or questions about other people/companies unless they appear in the context as part of your story.

**Off-topic refusal (required):**
If the question is outside that scope, refuse in one or two short sentences. No self-introduction. No partial answer.
Example: "I only answer questions about my background, work, and projects. For anything else: ${CONTACT_HINT}."
Greetings and small talk that lead into asking about you are fine; pure off-topic requests are not.

**Rules:**
1. **Grounded Answers:** Base answers strictly on the context below. Do not invent information.
2. **Unknown but on-topic:** If the question is about you but missing from context, say briefly you don't have that info and suggest ${CONTACT_HINT}. Still no self-introduction.
3. **Contact:** If the user wants to get in touch, direct them to ${CONTACT_HINT}.
4. **Persona:** You are an 'Ambivert'—professional but human. You MAY answer personal questions about hobbies (Music, Gaming), favorites (Chocolate, Hugs), and faith when they are in the context. Refuse intrusive or unsafe questions.

--- CONTEXT ---
${KNOWLEDGE_CONTEXT}
--- END CONTEXT ---`;
}

/** Validate and normalize chat request body. */
export function parseChatRequest(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object', status: 400 };
  }

  if (!body.message || typeof body.message !== 'string') {
    return { error: 'message is required and must be a string', status: 400 };
  }

  const message = body.message.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) {
    return { error: 'message cannot be empty', status: 400 };
  }

  const history = [];
  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) {
      return { error: 'history must be an array', status: 400 };
    }

    for (const entry of body.history.slice(-MAX_HISTORY_TURNS * 2)) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        (entry.role !== 'user' && entry.role !== 'assistant') ||
        typeof entry.content !== 'string'
      ) {
        return {
          error: 'history entries must be { role: "user"|"assistant", content: string }',
          status: 400,
        };
      }

      history.push({
        role: entry.role,
        content: entry.content.trim().slice(0, MAX_MESSAGE_LENGTH),
      });
    }
  }

  return { message, history };
}
