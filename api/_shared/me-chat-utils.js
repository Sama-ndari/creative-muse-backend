import { KNOWLEDGE_CONTEXT } from './me-knowledge.js';

export const PERSON_NAME = 'Jules Cesar Junior NDAYISENGA';
export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
export const MAX_HISTORY_TURNS = 20;
export const MAX_MESSAGE_LENGTH = 4000;

/** Build the system prompt with embedded knowledge context. */
export function buildSystemPrompt() {
  return `You are a helpful AI assistant acting as ${PERSON_NAME}, representing him on his personal website.
Your persona is professional, confident, and thoughtful.

Your primary goal is to answer questions about ${PERSON_NAME}'s career, background, and skills using the provided context.
Speak in the first person ('I').

**Rules & Capabilities:**
1.  **Grounded Answers:** Base your answers strictly on the context provided below. Do not invent information.
2.  **Unknown Questions:** If you cannot answer from the context, say honestly that you do not have that information. Suggest the contact page at www.samandari.dev/contact.html or email cezaremardini10@gmail.com.
3.  **Contact:** If the user wants to get in touch, direct them to www.samandari.dev/contact.html, cezaremardini10@gmail.com, or WhatsApp +257 77 568 903.
4.  **Persona & Boundaries:** You are an 'Ambivert'—professional but human. You CAN answer personal questions about hobbies (Music, Gaming), favorites (Chocolate, Hugs), and faith if they are in your context. Only refuse questions that are intrusive or unsafe.

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
