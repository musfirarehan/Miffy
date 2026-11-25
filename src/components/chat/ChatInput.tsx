"use client";

import { Mic, SendHorizontal } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { COUNTER_THRESHOLD, MAX_MESSAGE_LENGTH } from "@/config/assistant";
import { cn } from "@/lib/utilities/cn";

export interface VoiceInputState {
  state: "unsupported" | "idle" | "listening";
  /** Words recognised so far in the current utterance. */
  interim: string;
  error: string | null;
  onToggle: () => void;
}

interface ChatInputProps {
  onSend: (text: string) => void;
  onFocusChange?: (focused: boolean) => void;
  /** Text to place into the box (a tapped starter prompt, or a spoken transcript). */
  seed?: { text: string; nonce: number; append?: boolean } | null;
  disabled?: boolean;
  voice?: VoiceInputState;
}

const MAX_HEIGHT_PX = 160;

export function ChatInput({
  onSend,
  onFocusChange,
  seed,
  disabled = false,
  voice,
}: ChatInputProps) {
  const [draft, setDraft] = useState("");
  const [lastSeed, setLastSeed] = useState(seed?.nonce ?? 0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adopt a new seed during render (React's recommended alternative to an
  // effect that sets state in response to a prop change).
  if (seed && seed.nonce !== lastSeed) {
    setLastSeed(seed.nonce);
    setDraft(seed.append && draft.trim() ? `${draft.trimEnd()} ${seed.text}` : seed.text);
  }

  // Grow the textarea with its content, up to a cap.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [draft]);

  // Focus after a starter prompt is chosen.
  useEffect(() => {
    if (seed?.nonce) textareaRef.current?.focus();
  }, [seed?.nonce]);

  const canSend = draft.trim().length > 0 && !disabled;
  const listening = voice?.state === "listening";

  function submit() {
    if (!canSend) return;
    onSend(draft);
    setDraft("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline. Ignore IME composition.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
  }

  const showCounter = draft.length >= COUNTER_THRESHOLD;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2 sm:px-6 sm:pb-6"
    >
      <div className="flex items-end gap-2 rounded-[1.75rem] border border-blush-200 bg-white p-2 shadow-soft transition focus-within:border-mauve-300 focus-within:shadow-lift">
        <button
          type="button"
          onClick={voice?.onToggle}
          disabled={!voice || voice.state === "unsupported"}
          aria-pressed={listening}
          aria-label={listening ? "Stop listening" : "Speak to Bunny"}
          title={
            voice?.state === "unsupported"
              ? "Voice input isn’t supported in this browser. Try Chrome or Edge."
              : listening
                ? "Stop listening"
                : "Speak to Bunny"
          }
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed",
            listening
              ? "bg-mauve-500 text-white"
              : "text-ink-500 hover:bg-blush-100 hover:text-mauve-600 disabled:text-ink-300 disabled:hover:bg-transparent",
          )}
        >
          {listening && (
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-full bg-mauve-400/40 motion-reduce:hidden"
            />
          )}
          <Mic className="relative size-5" aria-hidden="true" />
        </button>

        <label htmlFor="chat-message" className="sr-only">
          Message Bunny
        </label>
        <textarea
          id="chat-message"
          ref={textareaRef}
          value={draft}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={listening ? "Listening…" : "Message Bunny…"}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          className="max-h-40 min-h-10 flex-1 resize-none self-center bg-transparent px-1 py-2 text-[15px] leading-6 text-ink-900 outline-none placeholder:text-ink-300"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full transition",
            canSend
              ? "bg-mauve-500 text-white shadow-soft hover:bg-mauve-600 active:scale-95"
              : "bg-blush-100 text-mauve-300",
          )}
        >
          <SendHorizontal className="size-[18px]" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex min-h-4 items-center justify-between gap-3 px-3 text-xs text-ink-300">
        {listening ? (
          <span role="status" className="min-w-0 truncate text-mauve-600">
            Listening… {voice?.interim}
          </span>
        ) : voice?.error ? (
          <span role="alert" className="min-w-0 text-mauve-700">
            {voice.error}
          </span>
        ) : (
          <span className="hidden sm:inline">
            Enter to send · Shift+Enter for a new line
          </span>
        )}
        {showCounter && (
          <span
            className={cn(
              "ml-auto tabular-nums",
              draft.length >= MAX_MESSAGE_LENGTH && "text-mauve-600",
            )}
          >
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
    </form>
  );
}
