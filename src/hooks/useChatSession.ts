"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MAX_MESSAGE_LENGTH } from "@/config/assistant";
import { MAX_CONTEXT_MESSAGES } from "@/config/chat-api";
import { ChatClientError, streamChat } from "@/features/assistant/chat-client";
import { createId } from "@/lib/utilities/id";
import type { ChatMessage } from "@/types/chat";

export type ChatStatus = "idle" | "streaming" | "error";

/**
 * Chat session state. Messages live in React state for now; Phase 4 swaps
 * this for Supabase-backed conversations behind the same interface.
 *
 * Flow: `send` appends the user message and an empty assistant message, then
 * streams deltas into the assistant message. On failure the partial reply is
 * kept (if any) and `retry` re-asks the same question.
 */
export function useChatSession() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // Bumped on reset so views holding local state (the draft) remount cleanly.
  const [sessionKey, setSessionKey] = useState(0);

  const messagesRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const commit = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  /** Streams a reply to the conversation ending in `history`'s last user message. */
  const run = useCallback(
    async (history: ChatMessage[]) => {
      const assistant: ChatMessage = {
        id: createId("msg"),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      commit([...history, assistant]);
      setStatus("streaming");
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          messages: history.slice(-MAX_CONTEXT_MESSAGES),
          signal: controller.signal,
          onDelta: (text) => {
            commit(
              messagesRef.current.map((m) =>
                m.id === assistant.id ? { ...m, content: m.content + text } : m,
              ),
            );
          },
        });
        setStatus("idle");
      } catch (caught) {
        if (controller.signal.aborted) {
          // Stopped by the user (or the chat was reset): keep what arrived.
          // Skip if a newer request has already taken over the session.
          if (abortRef.current === controller || abortRef.current === null) {
            setStatus("idle");
          }
        } else {
          setError(
            caught instanceof ChatClientError
              ? caught.message
              : "Something went wrong. Try again.",
          );
          setStatus("error");
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        // Drop an assistant bubble that never received any text.
        commit(
          messagesRef.current.filter(
            (m) => !(m.id === assistant.id && m.content === ""),
          ),
        );
      }
    },
    [commit],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!content || abortRef.current) return;
      const userMessage: ChatMessage = {
        id: createId("msg"),
        role: "user",
        content,
        createdAt: Date.now(),
      };
      void run([...messagesRef.current, userMessage]);
    },
    [run],
  );

  /** Re-asks the last user message, replacing any partial assistant reply. */
  const retry = useCallback(() => {
    if (abortRef.current) return;
    const current = messagesRef.current;
    let end = current.length;
    while (end > 0 && current[end - 1].role === "assistant") end--;
    if (end === 0) return;
    void run(current.slice(0, end));
  }, [run]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    commit([]);
    setStatus("idle");
    setError(null);
    setSessionKey((key) => key + 1);
  }, [commit]);

  // Cancel any in-flight request when the page unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  return { messages, status, error, sessionKey, send, retry, stop, reset };
}
