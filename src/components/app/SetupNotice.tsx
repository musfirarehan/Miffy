import { BunnyAvatar } from "@/components/avatar";

/** Shown when the server has no Supabase configuration yet. */
export function SetupNotice() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <BunnyAvatar expression="confused" size={120} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-medium text-ink-900">
          Bunny needs a little setup
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
          The app can’t find its Supabase settings. Add{" "}
          <code className="rounded bg-blush-100 px-1.5 py-0.5 text-[13px]">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="rounded bg-blush-100 px-1.5 py-0.5 text-[13px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          to your environment, then rebuild or restart. The README walks through it.
        </p>
      </div>
    </main>
  );
}
