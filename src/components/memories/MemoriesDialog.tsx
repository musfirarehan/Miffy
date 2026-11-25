"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useMemories } from "@/hooks/useMemories";
import {
  MAX_MEMORY_CHARS,
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABELS,
  type Memory,
  type MemoryCategory,
  type MemorySource,
} from "@/types/memory";

const SOURCE_LABEL: Record<MemorySource, string> = {
  manual: "Added by you",
  explicit: "You asked Bunny to remember",
  auto: "Learned by Bunny",
};

interface MemoriesDialogProps {
  open: boolean;
  onClose: () => void;
  memoryEnabled: boolean;
  onToggleMemory: (enabled: boolean) => void;
}

const inputClass =
  "h-10 rounded-xl border border-blush-200 bg-white px-3 text-sm outline-none transition placeholder:text-ink-300 focus:border-mauve-300";

function MemoryRow({
  memory,
  onEdit,
  onDelete,
}: {
  memory: Memory;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.content);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    if (content === memory.content) return setEditing(false);
    try {
      await onEdit(memory.id, content);
      setEditing(false);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t save that.");
    }
  }

  async function remove() {
    try {
      await onDelete(memory.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t delete that.");
    }
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            maxLength={MAX_MEMORY_CHARS}
            aria-label="Edit memory"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && (event.stopPropagation(), setEditing(false))}
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button type="submit" aria-label="Save memory" className="flex size-9 items-center justify-center rounded-lg text-mauve-600 hover:bg-blush-100">
            <Check className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Cancel edit" onClick={() => setEditing(false)} className="flex size-9 items-center justify-center rounded-lg text-ink-500 hover:bg-blush-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </form>
        {error && <p role="alert" className="pt-1 text-xs text-mauve-700">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 shadow-soft">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm text-ink-900">{memory.content}</p>
        <p className="mt-0.5 text-xs text-ink-300">{SOURCE_LABEL[memory.source]}</p>
        {error && <p role="alert" className="pt-1 text-xs text-mauve-700">{error}</p>}
      </div>
      <button
        type="button"
        aria-label={`Edit memory: ${memory.content}`}
        onClick={() => {
          setDraft(memory.content);
          setEditing(true);
        }}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-blush-100 hover:text-mauve-600"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Delete memory: ${memory.content}`}
        onClick={remove}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-blush-100 hover:text-mauve-600"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </li>
  );
}

function MemoriesBody({ memoryEnabled, onToggleMemory }: Omit<MemoriesDialogProps, "open" | "onClose">) {
  const { memories, error, add, edit, remove, clearAll } = useMemories(true);
  const [category, setCategory] = useState<MemoryCategory>("other");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    try {
      await add(category, text);
      setContent("");
      setFormError(null);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Couldn’t add that.");
    }
  }

  const grouped = MEMORY_CATEGORIES.map((cat) => ({
    category: cat,
    items: (memories ?? []).filter((m) => m.category === cat),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-blush-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Use memory</p>
          <p className="text-xs leading-snug text-ink-500">
            {memoryEnabled
              ? "Bunny uses and learns lasting facts about you."
              : "Memory is off. Nothing is used or learned."}
          </p>
        </div>
        <Toggle checked={memoryEnabled} onChange={onToggleMemory} label="Use memory" />
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-wrap gap-2">
        <select
          aria-label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value as MemoryCategory)}
          className={`${inputClass} w-full sm:w-auto`}
        >
          {MEMORY_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {MEMORY_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        <input
          value={content}
          maxLength={MAX_MEMORY_CHARS}
          placeholder="Tell Bunny something to remember"
          aria-label="New memory"
          onChange={(event) => setContent(event.target.value)}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-mauve-500 px-4 text-sm font-semibold text-white transition hover:bg-mauve-600 disabled:bg-blush-200 disabled:text-mauve-300"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add
        </button>
      </form>
      {formError && <p role="alert" className="pt-2 text-xs text-mauve-700">{formError}</p>}

      <div className="mt-6">
        {error && !memories ? (
          <p role="alert" className="text-sm text-mauve-700">{error}</p>
        ) : !memories ? (
          <div className="space-y-2" aria-label="Loading memories">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-blush-100/70" />
            ))}
          </div>
        ) : memories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-blush-200 px-4 py-6 text-center text-sm leading-relaxed text-ink-500">
            Nothing saved yet. Tell Bunny about yourself and she’ll remember the lasting
            parts, or add something above.
          </p>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <section key={group.category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-300">
                  {MEMORY_CATEGORY_LABELS[group.category]}
                </h3>
                <ul className="space-y-2">
                  {group.items.map((memory) => (
                    <MemoryRow
                      key={memory.id}
                      memory={memory}
                      onEdit={(id, text) => edit(id, { content: text })}
                      onDelete={remove}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {memories && memories.length > 0 && (
        <div className="mt-6 border-t border-blush-100 pt-4">
          {confirmingClear ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-700">Forget all {memories.length} memories?</span>
              <button
                type="button"
                onClick={async () => {
                  await clearAll();
                  setConfirmingClear(false);
                }}
                className="rounded-full bg-mauve-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-mauve-600"
              >
                Yes, forget everything
              </button>
              <button type="button" onClick={() => setConfirmingClear(false)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-blush-100">
                Keep them
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingClear(true)} className="text-sm text-mauve-600 underline-offset-2 hover:underline">
              Forget everything
            </button>
          )}
        </div>
      )}
    </>
  );
}

export function MemoriesDialog({ open, onClose, memoryEnabled, onToggleMemory }: MemoriesDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Memories"
      description="What Bunny knows about you. You can edit or delete anything."
    >
      <MemoriesBody memoryEnabled={memoryEnabled} onToggleMemory={onToggleMemory} />
    </Modal>
  );
}
