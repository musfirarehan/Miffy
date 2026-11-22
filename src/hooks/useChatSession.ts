"use client";

import { useCallback, useState } from "react";

import { MAX_MESSAGE_LENGTH } from "@/config/assistant";
import { createId } from "@/lib/utilities/id";
import type { ChatMessage } from "@/types/chat";

/**
 * In-memory chat session for the UI foundation.
 *
 * Phase 1–2 only: messages live in React state and are NOT persisted or sent
 * anywhere. Phase 3 replaces `send` with the real chat API and Phase 4 adds
 * Supabase persistence behind the same interface.
 */
export function useChatSession() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Bumped on reset so views holding local state (the draft) remount cleanly.
  const [sessionKey, setSessionKey] = useState(0);

  const send = useCallback((text: string) => {
    const content = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!content) return;
    setMessages((prev) => [
      ...prev,
      { id: createId("msg"), role: "user", content, createdAt: Date.now() },
    ]);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setSessionKey((key) => key + 1);
  }, []);

  return { messages, sessionKey, send, reset };
}
