import {
  MAX_ASSISTANT_MESSAGE_CHARS,
  MAX_REQUEST_MESSAGES,
} from "@/config/chat-api";
import { MAX_MESSAGE_LENGTH } from "@/config/assistant";
import type { AIMessage } from "@/lib/ai/types";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates the untrusted body of POST /api/chat. Only the fields we expect
 * are copied out, so unknown properties never reach the AI layer.
 */
export function parseChatRequest(
  body: unknown,
): ParseResult<{ messages: AIMessage[] }> {
  if (!isRecord(body) || !Array.isArray(body.messages)) {
    return { ok: false, message: "Expected an object with a messages array." };
  }
  const raw = body.messages;
  if (raw.length === 0 || raw.length > MAX_REQUEST_MESSAGES) {
    return {
      ok: false,
      message: `messages must contain between 1 and ${MAX_REQUEST_MESSAGES} items.`,
    };
  }

  const messages: AIMessage[] = [];
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item)) {
      return { ok: false, message: `messages[${index}] must be an object.` };
    }
    const { role, content } = item;
    if (role !== "user" && role !== "assistant") {
      return {
        ok: false,
        message: `messages[${index}].role must be "user" or "assistant".`,
      };
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return {
        ok: false,
        message: `messages[${index}].content must be a non-empty string.`,
      };
    }
    const limit = role === "user" ? MAX_MESSAGE_LENGTH : MAX_ASSISTANT_MESSAGE_CHARS;
    if (content.length > limit) {
      return {
        ok: false,
        message: `messages[${index}].content is too long (max ${limit} characters).`,
      };
    }
    messages.push({ role, content });
  }

  if (messages[messages.length - 1].role !== "user") {
    return { ok: false, message: "The last message must be from the user." };
  }
  return { ok: true, data: { messages } };
}
