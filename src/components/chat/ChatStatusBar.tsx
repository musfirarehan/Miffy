import { CircleAlert, RotateCcw, Square } from "lucide-react";

interface ChatStatusBarProps {
  streaming: boolean;
  error: string | null;
  onStop: () => void;
  onRetry: () => void;
}

/** Stop control while Bunny is replying, or the error message with Retry. */
export function ChatStatusBar({
  streaming,
  error,
  onStop,
  onRetry,
}: ChatStatusBarProps) {
  if (streaming) {
    return (
      <div className="mx-auto flex max-w-3xl justify-center px-4 pb-4 sm:px-6">
        <button
          type="button"
          onClick={onStop}
          className="flex h-9 items-center gap-2 rounded-full border border-blush-200 bg-white px-4 text-sm text-ink-700 shadow-soft transition hover:border-blush-300 hover:text-mauve-600"
        >
          <Square className="size-3.5 fill-current" aria-hidden="true" />
          Stop
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-blush-200 bg-blush-50 px-4 py-3 text-sm text-ink-700"
        >
          <CircleAlert
            className="mt-0.5 size-4 shrink-0 text-mauve-600"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-mauve-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-mauve-600"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
}
