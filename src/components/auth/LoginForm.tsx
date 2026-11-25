"use client";

import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hardNavigate } from "@/lib/utilities/navigation";

/** Only same-site relative paths are allowed as a post-login destination. */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(
        "Supabase isn’t configured yet. Add the Supabase URL and anon key to the environment.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(
        signInError.status === 400
          ? "That email or password doesn’t look right."
          : "Couldn’t sign in right now. Try again in a moment.",
      );
      setBusy(false);
      return;
    }
    // Full navigation so the proxy sees the fresh session cookie.
    hardNavigate(safeNext());
  }

  const inputClass =
    "h-11 w-full rounded-2xl border border-blush-200 bg-white px-4 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-mauve-300 focus:shadow-soft";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-3 text-left">
      <label className="block">
        <span className="mb-1 block px-1 text-xs font-semibold text-ink-500">
          Email
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block px-1 text-xs font-semibold text-ink-500">
          Password
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </label>

      {error && (
        <p role="alert" className="px-1 text-sm text-mauve-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-mauve-500 text-sm font-semibold text-white shadow-soft transition hover:bg-mauve-600 disabled:opacity-60"
      >
        <LogIn className="size-4" aria-hidden="true" />
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
