"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/types/chat";

import { MessageBubble, type SpeechControls } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  /** True while a reply is in flight; an empty assistant message shows as typing dots. */
  streaming?: boolean;
  /** Text-to-speech controls; omitted when the browser can't speak. */
  speech?: SpeechControls;
}

export function MessageList({ messages, streaming = false, speech }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  const lastLength = last?.content.length ?? 0;

  // Follow new messages and streamed text. Instant while streaming so the
  // view doesn't lag behind the text; smooth for discrete new messages.
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: streaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages.length, lastLength, streaming]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <ul className="flex flex-col gap-3" aria-label="Conversation">
        {messages.map((message) =>
          streaming && message.role === "assistant" && message.content === "" ? (
            <TypingIndicator key={message.id} />
          ) : (
            <MessageBubble
              key={message.id}
              message={message}
              // No listen button on a reply that is still being written.
              speech={streaming && message === last ? undefined : speech}
            />
          ),
        )}
      </ul>
      <div ref={endRef} />
    </div>
  );
}
