import { cn } from "@/lib/utilities/cn";
import type { ChatMessage } from "@/types/chat";

/**
 * Message content is rendered as plain text (React escapes it), never as
 * HTML, so user-generated content cannot inject markup.
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <li
      className={cn(
        "flex animate-fade-up",
        isUser ? "justify-end" : "justify-start",
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
    </li>
  );
}
