export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Unix epoch milliseconds. */
  createdAt: number;
}

/** Wire format of POST /api/chat: one JSON object per line (NDJSON). */
export type ChatStreamEvent =
  | { type: "meta"; conversationId: string; title: string; isNew: boolean }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; code: string; message: string };

/** Error body returned (with a non-200 status) before streaming begins. */
export interface ChatErrorBody {
  error: { code: string; message: string };
}
