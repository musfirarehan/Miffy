export type SassLevel = "gentle" | "balanced" | "savage";

export const SASS_LEVELS: readonly SassLevel[] = ["gentle", "balanced", "savage"];

export interface UserSettings {
  /** How Bunny addresses the user. Null until the user sets it. */
  displayName: string | null;
  /** Master switch for long-term memory (retrieval and learning). */
  memoryEnabled: boolean;
  sassLevel: SassLevel;
  /** `SpeechSynthesisVoice.voiceURI`; null means the browser default. */
  voiceUri: string | null;
  voiceRate: number;
  voicePitch: number;
  /** Read every reply aloud automatically. */
  autoSpeak: boolean;
  voiceMuted: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: null,
  memoryEnabled: true,
  sassLevel: "balanced",
  voiceUri: null,
  voiceRate: 1,
  voicePitch: 1,
  autoSpeak: false,
  voiceMuted: false,
};
