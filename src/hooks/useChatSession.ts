"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MAX_MESSAGE_LENGTH } from "@/config/assistant";
import { ChatClientError, streamChat } from "@/features/assistant/chat-client";
import { api, ApiClientError } from "@/lib/api-client";
import { createId } from "@/lib/utilities/id";
import type { ChatMessage } from "@/types/chat";
import type { ConversationDetail } from "@/types/conversation";

export type ChatStatus = "idle" | "streaming" | "error";

export interface ChatSessionOptions {
  /** The conversation list should refresh (new conversation, new reply, new title). */
  onConversationsChanged?: () => void;
  /** A reply finished streaming successfully (with the id of its message bubble). */
  onReplyComplete?: (text: string, messageId: string) => void;
}

/** What a retry should do after a failure. */
interface Attempt {
  text: string;
  /** True once the server saved the user's message, so retry re-answers it. */
  persisted: boolean;
}

/**
 * Persisted chat session. The server owns history: the client only sends the
 * new message (or `regenerate`) plus the conversation id, and streams the
 * reply back into an optimistic assistant bubble.
 */
export function useChatSession({
  onConversationsChanged,
  onReplyComplete,
}: ChatSessionOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Bumped on reset/open so views holding local state (the draft) remount cleanly.
  const [sessionKey, setSessionKey] = useState(0);

  const messagesRef = useRef<ChatMessage[]>([]);
  const conversationIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const attemptRef = useRef<Attempt | null>(null);
  const loadTokenRef = useRef(0);
  const titleTimerRef = useRef<number | undefined>(undefined);
  const callbacksRef = useRef({ onConversationsChanged, onReplyComplete });

  useEffect(() => {
    callbacksRef.current = { onConversationsChanged, onReplyComplete };
  });

  const commit = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const setConversationId = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    setConversationIdState(id);
  }, []);

  /** Streams a reply. `base` is the conversation shown so far (ends with the user's turn). */
  const run = useCallback(
    async (base: ChatMessage[], request: { message?: string; regenerate?: boolean }) => {
      const assistant: ChatMessage = {
        id: createId("msg"),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      commit([...base, assistant]);
      setStatus("streaming");
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;
      const lastUserText =
        request.message ?? [...base].reverse().find((m) => m.role === "user")?.content ?? "";
      attemptRef.current = { text: lastUserText, persisted: false };

      try {
        await streamChat({
          conversationId: conversationIdRef.current,
          message: request.message,
          regenerate: request.regenerate,
          signal: controller.signal,
          onPersisted: (id) => {
            if (attemptRef.current) attemptRef.current.persisted = true;
            // The id going from "none" to a value means a conversation was just created.
            const created = conversationIdRef.current === null;
            setConversationId(id);
            if (created) callbacksRef.current.onConversationsChanged?.();
          },
          onDelta: (text) => {
            commit(
              messagesRef.current.map((m) =>
                m.id === assistant.id ? { ...m, content: m.content + text } : m,
              ),
            );
          },
        });
        setStatus("idle");
        attemptRef.current = null;
        const reply = messagesRef.current.find((m) => m.id === assistant.id)?.content ?? "";
        callbacksRef.current.onReplyComplete?.(reply, assistant.id);
        callbacksRef.current.onConversationsChanged?.();
        // The AI-written title is generated in the background; pick it up.
        window.clearTimeout(titleTimerRef.current);
        titleTimerRef.current = window.setTimeout(
          () => callbacksRef.current.onConversationsChanged?.(),
          3500,
        );
      } catch (caught) {
        if (controller.signal.aborted) {
          // Stopped by the user (or the chat was reset): keep what arrived.
          if (abortRef.current === controller || abortRef.current === null) setStatus("idle");
          attemptRef.current = null;
        } else {
          setError(
            caught instanceof ChatClientError || caught instanceof ApiClientError
              ? caught.message
              : "Something went wrong. Try again.",
          );
          setStatus("error");
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        // Drop an assistant bubble that never received any text.
        commit(
          messagesRef.current.filter((m) => !(m.id === assistant.id && m.content === "")),
        );
      }
    },
    [commit, setConversationId],
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
      void run([...messagesRef.current, userMessage], { message: content });
    },
    [run],
  );

  /**
   * Retries after a failure. If the server already saved the user's message,
   * it re-answers it (replacing any partial reply); otherwise the message is
   * sent again as new, so nothing is ever duplicated or lost.
   */
  const retry = useCallback(() => {
    if (abortRef.current) return;
    const current = messagesRef.current;
    let end = current.length;
    while (end > 0 && current[end - 1].role === "assistant") end--;
    if (end === 0) return;
    const base = current.slice(0, end);
    const attempt = attemptRef.current;
    if (attempt && !attempt.persisted) {
      void run(base, { message: attempt.text });
    } else {
      void run(base, { regenerate: true });
    }
  }, [run]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    attemptRef.current = null;
    loadTokenRef.current++;
    window.clearTimeout(titleTimerRef.current);
    commit([]);
    setConversationId(null);
    setStatus("idle");
    setError(null);
    setLoading(false);
    setSessionKey((key) => key + 1);
  }, [commit, setConversationId]);

  /** Opens a saved conversation from history. */
  const open = useCallback(
    async (id: string) => {
      if (id === conversationIdRef.current && !abortRef.current) return;
      abortRef.current?.abort();
      abortRef.current = null;
      attemptRef.current = null;
      const token = ++loadTokenRef.current;
      setLoading(true);
      setStatus("idle");
      setError(null);
      try {
        const { conversation } = await api<{ conversation: ConversationDetail }>(
          `/api/conversations/${id}`,
        );
        if (token !== loadTokenRef.current) return; // a newer open/reset won
        commit(conversation.messages);
        setConversationId(conversation.id);
        setSessionKey((key) => key + 1);
      } catch (caught) {
        if (token !== loadTokenRef.current) return;
        setError(caught instanceof Error ? caught.message : "Couldn’t open that conversation.");
        setStatus("error");
      } finally {
        if (token === loadTokenRef.current) setLoading(false);
      }
    },
    [commit, setConversationId],
  );

  // Cancel any in-flight request when the page unmounts.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      window.clearTimeout(titleTimerRef.current);
    },
    [],
  );

  return {
    messages,
    status,
    error,
    conversationId,
    loading,
    sessionKey,
    send,
    retry,
    stop,
    reset,
    open,
  };
}
