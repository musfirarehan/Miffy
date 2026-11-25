"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api-client";
import type { ConversationSummary } from "@/types/conversation";

const SEARCH_DEBOUNCE_MS = 250;

/** Conversation history with debounced server-side search. */
export function useConversations() {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryRef = useRef("");
  const requestRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  const fetchList = useCallback(async (q: string) => {
    const token = ++requestRef.current;
    try {
      const path = q.trim() ? `/api/conversations?q=${encodeURIComponent(q.trim())}` : "/api/conversations";
      const data = await api<{ conversations: ConversationSummary[] }>(path);
      if (token !== requestRef.current) return; // a newer request superseded this one
      setItems(data.conversations);
      setError(null);
    } catch (caught) {
      if (token !== requestRef.current) return;
      setError(caught instanceof Error ? caught.message : "Couldn’t load your conversations.");
    }
  }, []);

  // Initial load. State is set from the promise callbacks, not synchronously here.
  useEffect(() => {
    const token = ++requestRef.current;
    api<{ conversations: ConversationSummary[] }>("/api/conversations")
      .then((data) => {
        if (token !== requestRef.current) return;
        setItems(data.conversations);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (token !== requestRef.current) return;
        setError(caught instanceof Error ? caught.message : "Couldn’t load your conversations.");
      });
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      queryRef.current = q;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void fetchList(q), SEARCH_DEBOUNCE_MS);
    },
    [fetchList],
  );

  const refresh = useCallback(() => fetchList(queryRef.current), [fetchList]);

  const rename = useCallback(
    async (id: string, title: string) => {
      await api(`/api/conversations/${id}`, { method: "PATCH", body: { title } });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await api(`/api/conversations/${id}`, { method: "DELETE" });
      setItems((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    },
    [],
  );

  return { items, query, error, search, refresh, rename, remove };
}
