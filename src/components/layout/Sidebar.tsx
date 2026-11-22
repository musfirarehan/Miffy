"use client";

import { Brain, MessageCircle, Plus, Search, Settings, X } from "lucide-react";
import { useEffect } from "react";

import { BunnyAvatar } from "@/components/avatar";
import { APP_NAME } from "@/config/assistant";
import { cn } from "@/lib/utilities/cn";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  hasActiveChat: boolean;
}

function SidebarContent({
  onClose,
  onNewChat,
  hasActiveChat,
}: Omit<SidebarProps, "open">) {
  return (
    <div className="flex h-full flex-col bg-cream-100">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-blush-100">
            <div className="mt-1.5">
              <BunnyAvatar size={28} animated={false} />
            </div>
          </div>
          <span className="font-display text-lg font-medium text-ink-900">
            {APP_NAME}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close conversations"
          className="flex size-9 items-center justify-center rounded-full text-ink-500 hover:bg-blush-100 lg:hidden"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 px-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-mauve-500 text-sm font-semibold text-white shadow-soft transition hover:bg-mauve-600 active:scale-[0.99]"
        >
          <Plus className="size-4" aria-hidden="true" />
          New conversation
        </button>

        <div
          className="flex h-10 items-center gap-2 rounded-2xl border border-blush-200 bg-white/70 px-3 text-sm text-ink-300"
          title="Conversation search arrives with persistence"
        >
          <Search className="size-4" aria-hidden="true" />
          <span>Search (coming soon)</span>
        </div>
      </div>

      <nav
        aria-label="Conversations"
        className="mt-5 flex-1 overflow-y-auto px-3"
      >
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-300">
          Recent
        </p>
        {hasActiveChat ? (
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-ink-900 shadow-soft">
            <MessageCircle
              className="size-4 shrink-0 text-mauve-500"
              aria-hidden="true"
            />
            <span className="truncate">Current conversation</span>
          </div>
        ) : (
          <p className="px-2 text-sm leading-relaxed text-ink-500">
            Your conversations will show up here once history is saved.
          </p>
        )}
      </nav>

      <div className="space-y-1 border-t border-blush-100 p-3">
        {[
          { label: "Memories", icon: Brain },
          { label: "Settings", icon: Settings },
        ].map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled
            title={`${label} (coming soon)`}
            className="flex h-10 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm text-ink-500 opacity-60"
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Desktop: fixed column. Mobile: slide-over drawer with a backdrop,
 * Escape-to-close, and `inert` while hidden so it is not focusable.
 */
export function Sidebar({ open, onClose, onNewChat, hasActiveChat }: SidebarProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-blush-100 lg:block">
        <SidebarContent
          onClose={onClose}
          onNewChat={onNewChat}
          hasActiveChat={hasActiveChat}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        inert={!open}
      >
        <div
          onClick={onClose}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 bg-ink-900/30 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          aria-label="Conversations"
          className={cn(
            "absolute inset-y-0 left-0 w-[85%] max-w-xs shadow-lift transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent
            onClose={onClose}
            onNewChat={onNewChat}
            hasActiveChat={hasActiveChat}
          />
        </aside>
      </div>
    </>
  );
}
