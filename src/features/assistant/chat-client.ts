import type { ChatErrorBody, ChatMessage, ChatStreamEvent } from "@/types/chat";

export class ChatClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ChatClientError";
    this.code = code;
  }
}

export interface StreamChatOptions {
  messages: Pick<ChatMessage, "role" | "content">[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

/**
 * Calls POST /api/chat and feeds text deltas to `onDelta` as they arrive.
 * Resolves when the stream ends cleanly; throws `ChatClientError` otherwise.
 */
export async function streamChat({
  messages,
  signal,
  onDelta,
}: StreamChatOptions): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ChatClientError(
      "network",
      "Couldn’t reach Bunny. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ChatErrorBody | null;
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
    if (event.type === "delta") onDelta(event.text);
    else if (event.type === "done") finished = true;
    else if (event.type === "error") {
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
    throw new ChatClientError(
      "network",
      "The connection dropped while Bunny was replying.",
    );
  }

  if (!finished) {
    throw new ChatClientError(
      "network",
      "The connection dropped while Bunny was replying.",
    );
  }
}
