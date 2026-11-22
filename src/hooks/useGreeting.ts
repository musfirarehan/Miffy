"use client";

import { useSyncExternalStore } from "react";

function timeOfDayGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Up late again";
}

// Re-evaluate once a minute so the greeting rolls over naturally.
function subscribe(onChange: () => void): () => void {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

const getClientSnapshot = () => timeOfDayGreeting(new Date());
// The server cannot know the visitor's local time; use a neutral greeting
// for the first paint, then switch without a hydration mismatch.
const getServerSnapshot = () => "Hello";

/** Time-aware greeting, optionally personalised once a name is known. */
export function useGreeting(name?: string | null): string {
  const base = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  return name ? `${base}, ${name}` : base;
}
