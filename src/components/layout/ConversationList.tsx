"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { cn } from "@/lib/utilities/cn";
import { formatRelativeTime } from "@/lib/utilities/format-time";
import type { ConversationSummary } from "@/types/conversation";

interface ConversationListProps {
  items: ConversationSummary[] | null;
  error: string | null;
  searching: boolean;
  activeId: string | null;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type RowMode = { kind: "rename"; id: string } | { kind: "delete"; id: string } | null;

export function ConversationList({
  items,
  error,
  searching,
  activeId,
  onOpen,
  onRename,
  onDelete,
}: ConversationListProps) {
  const [mode, setMode] = useState<RowMode>(null);
  const [draft, setDraft] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  if (error && !items) {
    return <p className="px-2 text-sm leading-relaxed text-mauve-700">{error}</p>;
  }
  if (!items) {
    return (
      <div className="space-y-2 px-1" aria-label="Loading conversations">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-blush-100/70" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <p className="px-2 text-sm leading-relaxed text-ink-500">
        {searching
          ? "Nothing matches that search."
          : "Your conversations will show up here."}
      </p>
    );
  }

  async function submitRename(event: FormEvent, id: string) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    try {
      await onRename(id, title);
      setMode(null);
      setRowError(null);
    } catch (caught) {
      setRowError(caught instanceof Error ? caught.message : "Couldn’t rename that.");
    }
  }

  async function confirmDelete(id: string) {
    try {
      await onDelete(id);
      setMode(null);
      setRowError(null);
    } catch (caught) {
      setRowError(caught instanceof Error ? caught.message : "Couldn’t delete that.");
    }
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.id === activeId;
        const renaming = mode?.kind === "rename" && mode.id === item.id;
        const deleting = mode?.kind === "delete" && mode.id === item.id;

        if (renaming) {
          return (
            <li key={item.id}>
              <form
                onSubmit={(event) => submitRename(event, item.id)}
                className="flex items-center gap-1 rounded-xl bg-white p-1.5 shadow-soft"
              >
                <input
                  autoFocus
                  value={draft}
                  maxLength={200}
                  aria-label="Conversation title"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && setMode(null)}
                  className="h-8 min-w-0 flex-1 rounded-lg bg-cream-50 px-2 text-sm outline-none focus:ring-1 focus:ring-mauve-300"
                />
                <button type="submit" aria-label="Save title" className="flex size-8 items-center justify-center rounded-lg text-mauve-600 hover:bg-blush-100">
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button type="button" aria-label="Cancel rename" onClick={() => setMode(null)} className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-blush-100">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </form>
              {rowError && <p role="alert" className="px-2 pt-1 text-xs text-mauve-700">{rowError}</p>}
            </li>
          );
        }

        if (deleting) {
          return (
            <li key={item.id}>
              <div className="rounded-xl border border-blush-200 bg-blush-50 px-3 py-2 text-sm">
                <p className="truncate text-ink-700">Delete “{item.title}”?</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => confirmDelete(item.id)} className="rounded-full bg-mauve-500 px-3 py-1 text-xs font-semibold text-white hover:bg-mauve-600">
                    Delete
                  </button>
                  <button type="button" onClick={() => setMode(null)} className="rounded-full px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-blush-100">
                    Keep
                  </button>
                </div>
                {rowError && <p role="alert" className="pt-1 text-xs text-mauve-700">{rowError}</p>}
              </div>
            </li>
          );
        }

        return (
          <li key={item.id} className="group relative">
            <button
              type="button"
              onClick={() => onOpen(item.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "w-full rounded-xl px-3 py-2 text-left transition",
                active ? "bg-white shadow-soft" : "hover:bg-blush-100/70",
              )}
            >
              <span className="block truncate pr-14 text-sm text-ink-900">{item.title}</span>
              <span className="block text-xs text-ink-300">{formatRelativeTime(item.updatedAt)}</span>
            </button>
            <div className="absolute right-1.5 top-1.5 flex opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
              <button
                type="button"
                aria-label={`Rename ${item.title}`}
                onClick={() => {
                  setDraft(item.title);
                  setRowError(null);
                  setMode({ kind: "rename", id: item.id });
                }}
                className="flex size-8 items-center justify-center rounded-lg text-ink-300 hover:bg-blush-100 hover:text-mauve-600"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${item.title}`}
                onClick={() => {
                  setRowError(null);
                  setMode({ kind: "delete", id: item.id });
                }}
                className="flex size-8 items-center justify-center rounded-lg text-ink-300 hover:bg-blush-100 hover:text-mauve-600"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
