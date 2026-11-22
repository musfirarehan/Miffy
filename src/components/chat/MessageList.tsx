"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/types/chat";

import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  /** True while a reply is in flight; an empty assistant message shows as typing dots. */
  streaming?: boolean;
}

export function MessageList({ messages, streaming = false }: MessageListProps) {
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
            <MessageBubble key={message.id} message={message} />
          ),
        )}
      </ul>
      <div ref={endRef} />
    </div>
  );
}
