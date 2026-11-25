/**
 * Minimal typings for the Web Speech API's recognition half, which is not in
 * TypeScript's DOM lib. It is vendor-prefixed in Chromium-based browsers.
 */
export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Friendly messages for the error codes the API reports. */
export function describeRecognitionError(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow it in your browser’s site settings to talk to Bunny.";
    case "no-speech":
      return "I didn’t hear anything. Tap the mic and try again.";
    case "audio-capture":
      return "I can’t find a microphone.";
    case "network":
      return "Voice input needs an internet connection.";
    case "aborted":
      return null; // we stopped it ourselves
    default:
      return "Voice input hit a snag. Try again.";
  }
}
