import "server-only";

import { AIError } from "./types";

export interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
  /** Optional override of the provider's API base URL (used for testing). */
  baseUrl?: string;
}

/**
 * Reads provider settings from server-side environment variables only.
 * Model names are deliberately not hardcoded anywhere in the codebase:
 * they come from `AI_MODEL`, so switching models is a config change.
 */
export function readAIConfig(env: NodeJS.ProcessEnv = process.env): AIConfig {
  const provider = (env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  const model = env.AI_MODEL?.trim();
  const apiKey = readApiKey(provider, env);

  if (!model || !apiKey) throw new AIError("not_configured");

  return {
    provider,
    model,
    apiKey,
    baseUrl: env.AI_BASE_URL?.trim() || undefined,
  };
}

function readApiKey(provider: string, env: NodeJS.ProcessEnv): string | undefined {
  switch (provider) {
    case "gemini":
      return env.GEMINI_API_KEY?.trim() || undefined;
    default:
      return undefined;
  }
}
