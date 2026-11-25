"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  describeRecognitionError,
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "./speech-recognition";

const subscribeNever = () => () => undefined;

interface Options {
  /** Called once with the final transcript when an utterance ends. */
  onFinal: (text: string) => void;
}

/**
 * Push-to-talk speech input. Listening only ever starts from an explicit
 * call to `start()` (the mic button), covers a single utterance, and is
 * aborted on unmount: nothing listens in the background.
 */
export function useSpeechRecognition({ onFinal }: Options) {
  const supported = useSyncExternalStore(
    subscribeNever,
    () => getSpeechRecognitionCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";
    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterim(interimText);
    };
    recognition.onerror = (event) => setError(describeRecognitionError(event.error));
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
      const text = finalText.trim();
      if (text) onFinalRef.current(text);
    };

    setError(null);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setError("Voice input couldn’t start. Try again.");
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(
    () => () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onend = null;
        recognition.abort();
      }
    },
    [],
  );

  return { supported, listening, interim, error, start, stop, toggle, clearError };
}
