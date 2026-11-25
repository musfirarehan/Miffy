"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Accessible modal built on the native <dialog>: the browser provides the
 * focus trap, Escape-to-close and inert background. Content is only mounted
 * while open, so each opening starts from a clean state.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Only a click on the backdrop itself lands on the <dialog> element.
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(92vw,34rem)] overflow-hidden rounded-3xl border border-blush-100 bg-cream-50 p-0 text-ink-900 shadow-lift backdrop:bg-ink-900/30"
    >
      {open && (
        <div className="flex max-h-[88dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-blush-100 px-6 pb-4 pt-5">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-xl font-medium text-ink-900">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition hover:bg-blush-100"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
