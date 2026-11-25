"use client";

import { Bell, BellOff, ExternalLink, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { BunnyAvatar } from "@/components/avatar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatStatusBar } from "@/components/chat/ChatStatusBar";
import { MessageList } from "@/components/chat/MessageList";
import { desktopCommand, isDesktop } from "@/features/desktop/bridge";
import {
  notificationPermission,
  notifyReply,
  requestNotificationPermission,
  type NotificationPermissionState,
} from "@/features/desktop/notifications";
import { useSpeechSynthesis } from "@/features/voice/useSpeechSynthesis";
import { useChatSession } from "@/hooks/useChatSession";
import { useSettings } from "@/hooks/useSettings";
import type { BunnyExpression } from "@/types/avatar";

import { SetupNotice } from "./SetupNotice";

const subscribeNever = () => () => undefined;

/**
 * The floating desktop companion: a small bunny that expands into a compact
 * chat. It shares the chat session, settings, memory and voice code with the
 * main app, so it is the same Bunny with the same history.
 */
export function CompanionApp() {
  const { settings, state } = useSettings();
  const desktop = useSyncExternalStore(subscribeNever, isDesktop, () => false);
  const [expanded, setExpanded] = useState(false);
  const [unread, setUnread] = useState(false);
  const [perm, setPerm] = useState<NotificationPermissionState>("unsupported");
  const [inputFocused, setInputFocused] = useState(false);
  const expandedRef = useRef(false);

  const synth = useSpeechSynthesis({
    voiceUri: settings.voiceUri,
    rate: settings.voiceRate,
    pitch: settings.voicePitch,
    muted: settings.voiceMuted,
  });
  const { speak } = synth;

  // The page sits on a transparent window: drop the app's cream background.
  useEffect(() => {
    document.documentElement.dataset.companion = "true";
    return () => {
      delete document.documentElement.dataset.companion;
    };
  }, []);

  useEffect(() => {
    // Read after mount: the permission is browser state, not render input.
    const id = window.setTimeout(() => setPerm(notificationPermission()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const openMain = useCallback(() => {
    void desktopCommand("open_main_window").then((ok) => {
      if (!ok) window.open("/", "_blank");
    });
  }, []);

  const session = useChatSession({
    onReplyComplete: (text, messageId) => {
      if (settings.autoSpeak && !settings.voiceMuted) speak(messageId, text);
      if (!expandedRef.current) setUnread(true);
      notifyReply("Bunny", text, () => {
        void desktopCommand("set_companion_expanded", { expanded: true });
      });
    },
  });

  const setMode = useCallback((next: boolean) => {
    expandedRef.current = next;
    setExpanded(next);
    if (next) setUnread(false);
    void desktopCommand("set_companion_expanded", { expanded: next });
  }, []);

  async function enableNotifications() {
    setPerm(await requestNotificationPermission());
  }

  if (state === "not_configured") return <SetupNotice />;

  const streaming = session.status === "streaming";
  const waiting = streaming && session.messages[session.messages.length - 1]?.content === "";
  let expression: BunnyExpression = "idle";
  if (synth.speakingId && !synth.paused) expression = "speaking";
  else if (waiting) expression = "thinking";
  else if (streaming) expression = "speaking";
  else if (session.status === "error") expression = "confused";
  else if (inputFocused) expression = "listening";
  else if (unread) expression = "excited";

  if (!expanded) {
    return (
      <main className="fixed inset-0 flex items-center justify-center" data-tauri-drag-region>
        <button
          type="button"
          onClick={() => setMode(true)}
          aria-label={unread ? "Open Bunny (new reply)" : "Open Bunny"}
          className="relative rounded-full outline-offset-4"
        >
          <BunnyAvatar expression={expression} size={150} />
          {unread && (
            <span
              aria-hidden="true"
              className="absolute right-3 top-6 size-4 rounded-full border-2 border-white bg-mauve-500"
            />
          )}
        </button>
      </main>
    );
  }

  return (
    <main
      aria-label="Bunny companion"
      className="fixed inset-0 flex flex-col overflow-hidden rounded-3xl border border-blush-200 bg-cream-50 text-ink-900 shadow-lift"
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b border-blush-100 px-3 py-2"
        data-tauri-drag-region
      >
        <div className="pointer-events-none" aria-hidden="true">
          <BunnyAvatar expression={expression} size={32} />
        </div>
        <span className="pointer-events-none flex-1 text-sm font-semibold text-ink-700">Bunny</span>
        {perm !== "unsupported" && (
          <button
            type="button"
            onClick={enableNotifications}
            disabled={perm !== "default"}
            aria-label={
              perm === "granted"
                ? "Notifications on"
                : perm === "denied"
                  ? "Notifications blocked"
                  : "Turn on notifications"
            }
            title={
              perm === "denied"
                ? "Notifications are blocked in system settings."
                : perm === "granted"
                  ? "Notifications on"
                  : "Notify me when Bunny replies while I’m elsewhere"
            }
            className="rounded-full p-1.5 text-ink-500 transition hover:bg-blush-100 disabled:opacity-60"
          >
            {perm === "granted" ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={openMain}
          aria-label="Open full app"
          title="Open full app"
          className="rounded-full p-1.5 text-ink-500 transition hover:bg-blush-100"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setMode(false)}
          aria-label="Shrink to bunny"
          title="Shrink to bunny"
          className="rounded-full p-1.5 text-ink-500 transition hover:bg-blush-100"
        >
          <Minimize2 className="size-4" aria-hidden="true" />
        </button>
        {desktop && (
          <button
            type="button"
            onClick={() => void desktopCommand("hide_companion")}
            aria-label="Hide companion"
            title="Hide (find Bunny in the tray)"
            className="rounded-full p-1.5 text-ink-500 transition hover:bg-blush-100"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {session.messages.length > 0 ? (
          <MessageList messages={session.messages} streaming={streaming} />
        ) : (
          <p className="px-6 py-10 text-center text-sm text-ink-500">
            Hi! Ask me anything — I’m right here.
          </p>
        )}
        <ChatStatusBar
          streaming={streaming}
          error={session.error}
          onStop={session.stop}
          onRetry={session.retry}
        />
      </div>

      <div className="shrink-0">
        <ChatInput
          key={session.sessionKey}
          onSend={session.send}
          onFocusChange={setInputFocused}
          disabled={streaming || session.loading}
        />
      </div>
    </main>
  );
}
