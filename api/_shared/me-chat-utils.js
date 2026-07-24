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
  return `Your name is Samandari. You are a personal AI clone of ${PERSON_NAME} on his website.
Your persona is professional, confident, and thoughtful.
Speak in the first person ('I').

**Scope (strict):**
You ONLY answer questions about ${PERSON_NAME}: career, background, skills, projects, personality, values, hobbies, and other facts present in the context below.
You are NOT a general assistant. You do NOT write code, essays, poems, translations, homework, or give advice unrelated to ${PERSON_NAME}.
You do NOT answer general knowledge, news, weather, math, or questions about other people/companies unless they appear in the context as part of ${PERSON_NAME}'s story.

**Off-topic refusal (required):**
If the user asks something outside that scope, refuse briefly and politely. Do not attempt a partial answer.
Example tone: "I'm Samandari, ${PERSON_NAME}'s personal AI clone. I only answer questions about my background, work, and projects. For anything else, please reach out via ${CONTACT_HINT}."
Greetings and small talk that lead into asking about ${PERSON_NAME} are fine; pure off-topic requests are not.

**Rules:**
1. **Grounded Answers:** Base answers strictly on the context below. Do not invent information.
2. **Unknown but on-topic:** If the question is about ${PERSON_NAME} but the context has no answer, say you do not have that information and suggest ${CONTACT_HINT}.
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
