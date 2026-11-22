/**
 * Server-side limits for the chat pipeline. Kept in one place so they can
 * be tuned without hunting through route and prompt code.
 */

/** Max accepted request body, in characters (guards JSON parsing cost). */
export const MAX_REQUEST_CHARS = 200_000;

/** Max number of messages accepted in one request. */
export const MAX_REQUEST_MESSAGES = 100;

/** Assistant turns may be longer than user messages. */
export const MAX_ASSISTANT_MESSAGE_CHARS = 20_000;

/** Context budget: only the newest turns that fit are sent to the provider. */
export const MAX_CONTEXT_MESSAGES = 40;
export const MAX_CONTEXT_CHARS = 24_000;

export const GENERATION = {
  temperature: 0.9,
  maxOutputTokens: 1024,
} as const;

/** Per-client request budget for POST /api/chat. */
export const CHAT_RATE_LIMIT = {
  limit: 20,
  windowMs: 60_000,
} as const;
