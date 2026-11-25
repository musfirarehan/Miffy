"use client";

import { Play } from "lucide-react";
import { useMemo } from "react";

import { Toggle } from "@/components/ui/Toggle";
import type { UserSettings } from "@/types/settings";

interface VoiceSettingsProps {
  settings: UserSettings;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  onUpdate: (patch: Partial<UserSettings>) => void;
  onTest: () => void;
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm text-ink-900">{title}</p>
        {hint && <p className="text-xs leading-snug text-ink-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function VoiceSettings({ settings, supported, voices, onUpdate, onTest }: VoiceSettingsProps) {
  // Prefer the user's language first, then the rest alphabetically.
  const sorted = useMemo(() => {
    const lang = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en";
    return [...voices].sort((a, b) => {
      const am = a.lang.startsWith(lang) ? 0 : 1;
      const bm = b.lang.startsWith(lang) ? 0 : 1;
      return am - bm || a.name.localeCompare(b.name);
    });
  }, [voices]);

  if (!supported) {
    return (
      <p className="text-sm leading-relaxed text-ink-500">
        This browser can’t speak replies aloud. Try Chrome, Edge or Safari. Voice input
        needs Chrome or Edge.
      </p>
    );
  }

  const slider = "h-2 w-36 cursor-pointer accent-mauve-500";

  return (
    <div>
      <Row title="Mute Bunny’s voice" hint="Silences all spoken replies.">
        <Toggle checked={settings.voiceMuted} onChange={(voiceMuted) => onUpdate({ voiceMuted })} label="Mute Bunny’s voice" />
      </Row>
      <Row
        title="Voice conversation"
        hint="Reads each reply aloud and sends what you say right away, so you can talk without typing."
      >
        <Toggle checked={settings.autoSpeak} onChange={(autoSpeak) => onUpdate({ autoSpeak })} label="Voice conversation" />
      </Row>

      <label className="mt-2 block">
        <span className="mb-1 block text-sm text-ink-900">Voice</span>
        <select
          value={settings.voiceUri ?? ""}
          onChange={(event) => onUpdate({ voiceUri: event.target.value || null })}
          className="h-10 w-full rounded-xl border border-blush-200 bg-white px-3 text-sm outline-none focus:border-mauve-300"
        >
          <option value="">Browser default</option>
          {sorted.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </label>

      <Row title="Speed">
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={settings.voiceRate}
          aria-label="Speaking speed"
          onChange={(event) => onUpdate({ voiceRate: Number(event.target.value) })}
          className={slider}
        />
      </Row>
      <Row title="Pitch">
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={settings.voicePitch}
          aria-label="Voice pitch"
          onChange={(event) => onUpdate({ voicePitch: Number(event.target.value) })}
          className={slider}
        />
      </Row>

      <button
        type="button"
        onClick={onTest}
        className="mt-2 flex h-10 items-center gap-2 rounded-full border border-blush-200 bg-white px-4 text-sm text-ink-700 transition hover:border-blush-300"
      >
        <Play className="size-4" aria-hidden="true" />
        Test voice
      </button>
    </div>
  );
}
