import { Pause, Play, Square, Volume2 } from "lucide-react";

import { cn } from "@/lib/utilities/cn";
import type { ChatMessage } from "@/types/chat";

export interface SpeechControls {
  speakingId: string | null;
  paused: boolean;
  onSpeak: (id: string, text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const controlClass =
  "flex size-7 items-center justify-center rounded-full text-ink-300 transition hover:bg-blush-100 hover:text-mauve-600";

/**
 * Message content is rendered as plain text (React escapes it), never as
 * HTML, so user-generated content cannot inject markup.
 */
export function MessageBubble({
  message,
  speech,
}: {
  message: ChatMessage;
  /** When provided, assistant messages get listen / pause / stop controls. */
  speech?: SpeechControls;
}) {
  const isUser = message.role === "user";
  const speakingThis = speech?.speakingId === message.id;

  return (
    <li
      className={cn(
        "flex animate-fade-up flex-col",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[75%]",
          isUser
            ? "rounded-br-lg bg-mauve-500 text-white shadow-soft"
            : "rounded-bl-lg border border-blush-100 bg-white text-ink-900 shadow-soft",
        )}
      >
        {message.content}
      </div>

      {!isUser && speech && message.content && (
        <div className="mt-1 flex items-center gap-0.5 pl-2">
          {speakingThis ? (
            <>
              {speech.paused ? (
                <button type="button" onClick={speech.onResume} aria-label="Resume speaking" className={controlClass}>
                  <Play className="size-3.5" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={speech.onPause} aria-label="Pause speaking" className={controlClass}>
                  <Pause className="size-3.5" aria-hidden="true" />
                </button>
              )}
              <button type="button" onClick={speech.onStop} aria-label="Stop speaking" className={controlClass}>
                <Square className="size-3 fill-current" aria-hidden="true" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => speech.onSpeak(message.id, message.content)}
              aria-label="Listen to this reply"
              className={controlClass}
            >
              <Volume2 className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
