"use client";

import { Brain, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utilities/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SASS_LEVELS, type SassLevel, type UserSettings } from "@/types/settings";
import { hardNavigate } from "@/lib/utilities/navigation";

const SASS_COPY: Record<SassLevel, { title: string; text: string }> = {
  gentle: { title: "Gentle", text: "Mostly warm. Teasing is rare and light." },
  balanced: { title: "Balanced", text: "Playful teasing with obvious affection." },
  savage: { title: "Savage", text: "Full roast energy when the mood is light." },
};

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
  email: string | null;
  saveError: string | null;
  onUpdate: (patch: Partial<UserSettings>) => void;
  onOpenMemories: () => void;
  /** Voice controls, supplied by the voice feature. */
  voiceSection?: ReactNode;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-blush-100 py-5 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{title}</h3>
      {children}
    </section>
  );
}

function NameField({ value, onSave }: { value: string | null; onSave: (name: string | null) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  const commit = () => {
    const next = draft.trim();
    if (next !== (value ?? "")) onSave(next || null);
  };
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-700">What should Bunny call you?</span>
      <input
        value={draft}
        maxLength={60}
        placeholder="Your name"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        className="h-11 w-full rounded-2xl border border-blush-200 bg-white px-4 text-[15px] outline-none transition placeholder:text-ink-300 focus:border-mauve-300 focus:shadow-soft"
      />
    </label>
  );
}

export function SettingsDialog({
  open,
  onClose,
  settings,
  email,
  saveError,
  onUpdate,
  onOpenMemories,
  voiceSection,
}: SettingsDialogProps) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await createSupabaseBrowserClient()?.auth.signOut();
    hardNavigate("/login");
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings" description="Everything saves automatically.">
      <Section title="You">
        <NameField value={settings.displayName} onSave={(displayName) => onUpdate({ displayName })} />
      </Section>

      <Section title="Personality">
        <div role="radiogroup" aria-label="Sass level" className="grid gap-2 sm:grid-cols-3">
          {SASS_LEVELS.map((level) => {
            const selected = settings.sassLevel === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onUpdate({ sassLevel: level })}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition",
                  selected
                    ? "border-mauve-400 bg-blush-50 shadow-soft"
                    : "border-blush-200 bg-white hover:border-blush-300",
                )}
              >
                <span className="block text-sm font-semibold text-ink-900">{SASS_COPY[level].title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-500">{SASS_COPY[level].text}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-300">Bunny never teases you when you’re upset.</p>
      </Section>

      <Section title="Memory">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink-900">Remember things about me</p>
            <p className="text-xs leading-snug text-ink-500">
              When off, Bunny neither uses nor learns memories. Saved ones are kept.
            </p>
          </div>
          <Toggle
            checked={settings.memoryEnabled}
            onChange={(memoryEnabled) => onUpdate({ memoryEnabled })}
            label="Remember things about me"
          />
        </div>
        <button
          type="button"
          onClick={onOpenMemories}
          className="mt-3 flex h-10 items-center gap-2 rounded-full border border-blush-200 bg-white px-4 text-sm text-ink-700 transition hover:border-blush-300"
        >
          <Brain className="size-4" aria-hidden="true" />
          Manage memories
        </button>
      </Section>

      {voiceSection && <Section title="Voice">{voiceSection}</Section>}

      <Section title="Account">
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-sm text-ink-700">{email ?? "Signed in"}</p>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-blush-200 bg-white px-4 text-sm text-ink-700 transition hover:border-blush-300 disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </Section>

      {saveError && (
        <p role="alert" className="mt-4 rounded-2xl bg-blush-50 px-4 py-2 text-sm text-mauve-700">
          {saveError}
        </p>
      )}
    </Modal>
  );
}
