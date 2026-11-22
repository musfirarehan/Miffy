"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { useChatSession } from "@/hooks/useChatSession";
import { useGreeting } from "@/hooks/useGreeting";
import type { BunnyExpression } from "@/types/avatar";

export default function Home() {
  const { messages, sessionKey, send, reset } = useChatSession();
  const greeting = useGreeting();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [seed, setSeed] = useState<{ text: string; nonce: number } | null>(
    null,
  );
  const sentTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(sentTimer.current), []);

  const handleSend = useCallback(
    (text: string) => {
      send(text);
      setJustSent(true);
      window.clearTimeout(sentTimer.current);
      sentTimer.current = window.setTimeout(() => setJustSent(false), 1800);
    },
    [send],
  );

  const handlePickPrompt = useCallback((text: string) => {
    setSeed((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const hasMessages = messages.length > 0;
  const expression: BunnyExpression = justSent
    ? "happy"
    : inputFocused
      ? "listening"
      : "idle";

  return (
    <div className="flex h-dvh overflow-hidden bg-cream-50 text-ink-900">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        onNewChat={reset}
        hasActiveChat={hasMessages}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          expression={expression}
          onOpenSidebar={openSidebar}
          onNewChat={reset}
        />

        <main className="flex-1 overflow-y-auto">
          {hasMessages ? (
            <>
              <MessageList messages={messages} />
              <p
                role="status"
                className="mx-auto max-w-3xl px-6 pb-6 text-center text-xs text-ink-300"
              >
                Bunny’s brain isn’t connected yet. Replies arrive in the next
                development phase.
              </p>
            </>
          ) : (
            <WelcomeScreen
              greeting={greeting}
              expression={expression}
              onPickPrompt={handlePickPrompt}
            />
          )}
        </main>

        <div className="shrink-0 bg-gradient-to-t from-cream-50 via-cream-50 to-transparent px-3 pb-4 pt-2 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <ChatInput
              key={sessionKey}
              onSend={handleSend}
              onFocusChange={setInputFocused}
              seed={seed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
