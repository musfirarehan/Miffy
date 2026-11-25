"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiClientError } from "@/lib/api-client";
import { DEFAULT_SETTINGS, type UserSettings } from "@/types/settings";

export type SettingsLoadState = "loading" | "ready" | "not_configured" | "error";

interface SettingsResponse {
  settings: UserSettings;
  account: { email: string | null };
}

/** Loads the signed-in user's settings and saves changes optimistically. */
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<SettingsLoadState>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<SettingsResponse>("/api/settings");
        if (cancelled) return;
        settingsRef.current = data.settings;
        setSettings(data.settings);
        setEmail(data.account.email);
        setState("ready");
      } catch (error) {
        if (cancelled) return;
        setState(
          error instanceof ApiClientError && error.code === "not_configured"
            ? "not_configured"
            : "error",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Applies the change immediately, then confirms with the server (rolls back on failure). */
  const update = useCallback(async (patch: Partial<UserSettings>) => {
    const previous = settingsRef.current;
    const optimistic = { ...previous, ...patch };
    settingsRef.current = optimistic;
    setSettings(optimistic);
    setSaveError(null);
    try {
      const data = await api<{ settings: UserSettings }>("/api/settings", {
        method: "PATCH",
        body: patch,
      });
      settingsRef.current = data.settings;
      setSettings(data.settings);
    } catch (error) {
      settingsRef.current = previous;
      setSettings(previous);
      setSaveError(error instanceof Error ? error.message : "Couldn’t save that.");
    }
  }, []);

  return { settings, email, state, saveError, update };
}
