"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { chunkForSpeech } from "./speech-text";

const subscribeNever = () => () => undefined;

// --- Voice list store -------------------------------------------------------
// getVoices() returns a fresh array each call and fills in asynchronously, so
// it is cached and only replaced when the set actually changes.
let cachedVoices: SpeechSynthesisVoice[] = [];
const EMPTY_VOICES: SpeechSynthesisVoice[] = [];

function readVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return EMPTY_VOICES;
  const next = window.speechSynthesis.getVoices();
  const same =
    next.length === cachedVoices.length &&
    next.every((voice, i) => voice.voiceURI === cachedVoices[i].voiceURI);
  if (!same) cachedVoices = next;
  return cachedVoices;
}

function subscribeVoices(onChange: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => undefined;
  const synth = window.speechSynthesis;
  synth.addEventListener("voiceschanged", onChange);
  return () => synth.removeEventListener("voiceschanged", onChange);
}

export interface SpeechOptions {
  voiceUri: string | null;
  rate: number;
  pitch: number;
  muted: boolean;
}

interface Active {
  id: string;
  paused: boolean;
}

/**
 * Text-to-speech with play, pause, resume and stop. Replies are spoken
 * sentence by sentence (see speech-text.ts), and `id` identifies which
 * message is currently being read so the UI can show the right controls.
 */
export function useSpeechSynthesis(options: SpeechOptions) {
  const supported = useSyncExternalStore(
    subscribeNever,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );
  const voices = useSyncExternalStore(subscribeVoices, readVoices, () => EMPTY_VOICES);
  const [active, setActive] = useState<Active | null>(null);

  const optionsRef = useRef(options);
  const voicesRef = useRef(voices);
  const tokenRef = useRef(0);
  useEffect(() => {
    optionsRef.current = options;
    voicesRef.current = voices;
  });

  const stop = useCallback(() => {
    tokenRef.current++; // invalidates callbacks from the utterance being cancelled
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActive(null);
  }, []);

  const speak = useCallback(
    (id: string, text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      const { voiceUri, rate, pitch, muted } = optionsRef.current;

      tokenRef.current++;
      synth.cancel();
      const chunks = chunkForSpeech(text);
      if (muted || chunks.length === 0) {
        setActive(null);
        return;
      }

      const token = tokenRef.current;
      const voice = voiceUri
        ? voicesRef.current.find((v) => v.voiceURI === voiceUri) ?? null
        : null;
      let index = 0;
      setActive({ id, paused: false });

      const speakNext = () => {
        if (token !== tokenRef.current) return;
        if (index >= chunks.length) {
          setActive(null);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index++]);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.onend = speakNext;
        utterance.onerror = () => {
          if (token === tokenRef.current) setActive(null);
        };
        synth.speak(utterance);
      };
      speakNext();
    },
    [],
  );

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setActive((prev) => (prev ? { ...prev, paused: true } : prev));
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setActive((prev) => (prev ? { ...prev, paused: false } : prev));
  }, []);

  // Never keep talking after the page goes away.
  useEffect(() => () => {
    tokenRef.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return {
    supported,
    voices,
    speakingId: active?.id ?? null,
    paused: active?.paused ?? false,
    speak,
    pause,
    resume,
    stop,
  };
}
