import type { ApiErrorBody } from "@/types/api";
import type { ChatStreamEvent } from "@/types/chat";
import { hardNavigate } from "@/lib/utilities/navigation";

export class ChatClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ChatClientError";
    this.code = code;
  }
}

export interface StreamChatOptions {
  /** Existing conversation, or null to start a new one. */
  conversationId: string | null;
  /** The user's new message. Omit when `regenerate` is true. */
  message?: string;
  /** Re-answer the last saved user message, replacing a failed/partial reply. */
  regenerate?: boolean;
  signal: AbortSignal;
  /** Called as soon as the server has saved the user's message and knows the conversation. */
  onPersisted: (conversationId: string, info: { isNew: boolean; title: string | null }) => void;
  onDelta: (text: string) => void;
}

/**
 * Calls POST /api/chat and feeds text deltas to `onDelta` as they arrive.
 * Resolves when the stream ends cleanly; throws `ChatClientError` otherwise.
 */
export async function streamChat(options: StreamChatOptions): Promise<void> {
  const { conversationId, message, regenerate, signal, onPersisted, onDelta } = options;

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, message, regenerate: regenerate === true }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ChatClientError(
      "network",
      "Couldn’t reach Bunny. Check your connection and try again.",
    );
  }

  if (response.status === 401) {
    hardNavigate("/login");
    throw new ChatClientError("unauthorized", "Please sign in.");
  }

  // The server sets this header only once it has saved the user's message,
  // even when the AI provider then fails. It tells retry what to do.
  const savedId = response.headers.get("X-Conversation-Id");
  if (savedId) onPersisted(savedId, { isNew: false, title: null });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ChatClientError(
      body?.error?.code ?? "http_error",
      body?.error?.message ?? "Something went wrong. Try again.",
    );
  }
  if (!response.body) {
    throw new ChatClientError("upstream", "Bunny sent back an empty reply.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    let event: ChatStreamEvent;
    try {
      event = JSON.parse(line) as ChatStreamEvent;
    } catch {
      return;
    }
    switch (event.type) {
      case "meta":
        onPersisted(event.conversationId, { isNew: event.isNew, title: event.title || null });
        break;
      case "delta":
        onDelta(event.text);
        break;
      case "done":
        finished = true;
        break;
      case "error":
        throw new ChatClientError(event.code, event.message);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        handleLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    }
    handleLine(buffer);
  } catch (error) {
    if (error instanceof ChatClientError || signal.aborted) throw error;
    throw new ChatClientError("network", "The connection dropped while Bunny was replying.");
  }

  if (!finished) {
    throw new ChatClientError("network", "The connection dropped while Bunny was replying.");
  }
}
