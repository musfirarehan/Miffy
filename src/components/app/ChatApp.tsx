"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatStatusBar } from "@/components/chat/ChatStatusBar";
import { MessageList } from "@/components/chat/MessageList";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { MemoriesDialog } from "@/components/memories/MemoriesDialog";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useChatSession } from "@/hooks/useChatSession";
import { useConversations } from "@/hooks/useConversations";
import { useGreeting } from "@/hooks/useGreeting";
import { useSettings } from "@/hooks/useSettings";
import type { BunnyExpression } from "@/types/avatar";

import { SetupNotice } from "./SetupNotice";

export function ChatApp() {
  const conversations = useConversations();
  const { settings, email, state, saveError, update } = useSettings();
  const session = useChatSession({ onConversationsChanged: conversations.refresh });
  const greeting = useGreeting(settings.displayName);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [seed, setSeed] = useState<{ text: string; nonce: number } | null>(null);
  const sentTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(sentTimer.current), []);

  const { send } = session;
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

  const { reset, conversationId } = session;
  const { remove: removeConversation } = conversations;
  const handleDelete = useCallback(
    async (id: string) => {
      await removeConversation(id);
      if (id === conversationId) reset();
    },
    [removeConversation, conversationId, reset],
  );

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  if (state === "not_configured") return <SetupNotice />;

  const hasMessages = session.messages.length > 0;
  const streaming = session.status === "streaming";
  const waitingForText = streaming && session.messages[session.messages.length - 1]?.content === "";

  let expression: BunnyExpression = "idle";
  if (waitingForText || session.loading) expression = "thinking";
  else if (streaming) expression = "speaking";
  else if (session.status === "error") expression = "confused";
  else if (justSent) expression = "happy";
  else if (inputFocused) expression = "listening";

  return (
    <div className="flex h-dvh overflow-hidden bg-cream-50 text-ink-900">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        onNewChat={reset}
        onOpenMemories={() => setMemoriesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        conversations={{
          items: conversations.items,
          error: conversations.error,
          query: conversations.query,
          onSearch: conversations.search,
          activeId: session.conversationId,
          onOpen: (id) => void session.open(id),
          onRename: conversations.rename,
          onDelete: handleDelete,
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          expression={expression}
          onOpenSidebar={openSidebar}
          onNewChat={reset}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {session.loading ? (
            <div className="mx-auto max-w-3xl space-y-3 px-4 py-6 sm:px-6" aria-label="Loading conversation">
              <div className="ml-auto h-10 w-2/5 animate-pulse rounded-3xl bg-blush-100" />
              <div className="h-16 w-3/5 animate-pulse rounded-3xl bg-blush-100/70" />
            </div>
          ) : hasMessages ? (
            <>
              <MessageList messages={session.messages} streaming={streaming} />
              <ChatStatusBar
                streaming={streaming}
                error={session.error}
                onStop={session.stop}
                onRetry={session.retry}
              />
            </>
          ) : (
            <>
              <WelcomeScreen
                greeting={greeting}
                expression={expression}
                onPickPrompt={handlePickPrompt}
              />
              <ChatStatusBar
                streaming={false}
                error={session.error}
                onStop={session.stop}
                onRetry={session.retry}
              />
            </>
          )}
        </main>

        <div className="shrink-0 bg-gradient-to-t from-cream-50 via-cream-50 to-transparent px-3 pb-4 pt-2 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <ChatInput
              key={session.sessionKey}
              onSend={handleSend}
              onFocusChange={setInputFocused}
              seed={seed}
              disabled={streaming || session.loading}
            />
          </div>
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        email={email}
        saveError={saveError}
        onUpdate={(patch) => void update(patch)}
        onOpenMemories={() => {
          setSettingsOpen(false);
          setMemoriesOpen(true);
        }}
      />
      <MemoriesDialog
        open={memoriesOpen}
        onClose={() => setMemoriesOpen(false)}
        memoryEnabled={settings.memoryEnabled}
        onToggleMemory={(memoryEnabled) => void update({ memoryEnabled })}
      />
    </div>
  );
}
