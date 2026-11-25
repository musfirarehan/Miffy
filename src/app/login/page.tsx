import type { Metadata } from "next";

import { BunnyAvatar } from "@/components/avatar";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in · Bunny AI" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <BunnyAvatar expression="happy" size={132} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink-900">
          Welcome back
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
          Bunny is a private companion. Sign in to pick up where you left off.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
