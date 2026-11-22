import { BunnyAvatar } from "@/components/avatar";
import { STARTER_PROMPTS } from "@/config/assistant";
import type { BunnyExpression } from "@/types/avatar";

interface WelcomeScreenProps {
  greeting: string;
  expression: BunnyExpression;
  onPickPrompt: (prompt: string) => void;
}

export function WelcomeScreen({
  greeting,
  expression,
  onPickPrompt,
}: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-10 text-center">
      <div className="animate-fade-up">
        <BunnyAvatar expression={expression} size={168} />
      </div>

      <h1 className="mt-5 animate-fade-up font-display text-3xl font-medium tracking-tight text-ink-900 [animation-delay:80ms] sm:text-4xl">
        {greeting}
      </h1>
      <p className="mt-2 max-w-md animate-fade-up text-[15px] leading-relaxed text-ink-500 [animation-delay:140ms]">
        I’m Bunny. Tell me what’s on your mind and I’ll be honest with you,
        and probably a little rude about it.
      </p>

      <ul className="mt-8 grid w-full animate-fade-up grid-cols-1 gap-2.5 [animation-delay:220ms] sm:grid-cols-2">
        {STARTER_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPickPrompt(prompt)}
              className="w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-left text-sm text-ink-700 shadow-soft transition hover:-translate-y-0.5 hover:border-blush-300 hover:shadow-lift active:translate-y-0"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
