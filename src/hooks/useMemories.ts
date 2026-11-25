"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api-client";
import type { Memory, MemoryCategory } from "@/types/memory";

/** The user's long-term memories. Loads when `enabled` becomes true (dialog opened). */
export function useMemories(enabled: boolean) {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ memories: Memory[] }>("/api/memories");
      setMemories(data.memories);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t load memories.");
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api<{ memories: Memory[] }>("/api/memories")
      .then((data) => {
        if (cancelled) return;
        setMemories(data.memories);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Couldn’t load memories.");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const add = useCallback(async (category: MemoryCategory, content: string) => {
    const { memory } = await api<{ memory: Memory }>("/api/memories", {
      method: "POST",
      body: { category, content },
    });
    setMemories((prev) => [memory, ...(prev ?? [])]);
  }, []);

  const edit = useCallback(
    async (id: string, patch: { content?: string; category?: MemoryCategory }) => {
      const { memory } = await api<{ memory: Memory }>(`/api/memories/${id}`, {
        method: "PATCH",
        body: patch,
      });
      setMemories((prev) => prev?.map((m) => (m.id === id ? memory : m)) ?? prev);
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await api(`/api/memories/${id}`, { method: "DELETE" });
    setMemories((prev) => prev?.filter((m) => m.id !== id) ?? prev);
  }, []);

  const clearAll = useCallback(async () => {
    await api("/api/memories?all=true", { method: "DELETE" });
    setMemories([]);
  }, []);

  return { memories, error, add, edit, remove, clearAll, reload: load };
}
