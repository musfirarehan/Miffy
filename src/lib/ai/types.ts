/**
 * Provider-agnostic AI contracts. Application code (the chat route, the
 * assistant feature) depends only on these types; each provider lives in
 * `./providers/` and is the only place that knows a vendor's wire format.
 */

export type AIRole = "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIChatRequest {
  /** System + personality + retrieved-memory instructions, already assembled. */
  systemInstruction: string;
  /** Conversation turns, oldest first. Must end with the user's message. */
  messages: AIMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  /** Aborts the upstream request (e.g. the user closed the tab). */
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly id: string;
  /** Yields text deltas as they arrive. Throws `AIError` on failure. */
  streamChat(request: AIChatRequest): AsyncGenerator<string, void, void>;
}

export type AIErrorCode =
  | "not_configured"
  | "rate_limited"
  | "auth"
  | "bad_request"
  | "blocked"
  | "empty"
  | "timeout"
  | "aborted"
  | "upstream";

const USER_MESSAGES: Record<AIErrorCode, string> = {
  not_configured:
    "Bunny’s AI isn’t set up yet. Add the provider settings to the server environment.",
  rate_limited: "Bunny is getting too many requests right now. Try again in a moment.",
  auth: "The AI provider rejected the server’s API key. Check the server configuration.",
  bad_request: "The AI provider couldn’t handle that request.",
  blocked: "The AI provider declined to answer that one. Try rephrasing.",
  empty: "Bunny had nothing to say. Try again.",
  timeout: "Bunny took too long to answer. Try again.",
  aborted: "Request cancelled.",
  upstream: "Bunny couldn’t reach her brain just now. Try again in a moment.",
};

/**
 * Safe-to-show failure. `message` is always a curated string; raw upstream
 * response bodies are never forwarded to the browser.
 */
export class AIError extends Error {
  readonly code: AIErrorCode;

  constructor(code: AIErrorCode) {
    super(USER_MESSAGES[code]);
    this.name = "AIError";
    this.code = code;
  }
}

/** HTTP status the chat route uses when an error happens before streaming. */
export function httpStatusForAIError(code: AIErrorCode): number {
  switch (code) {
    case "not_configured":
      return 503;
    case "rate_limited":
      return 429;
    case "blocked":
      return 422;
    case "timeout":
      return 504;
    case "aborted":
      return 499;
    default:
      return 502;
  }
}
