import "server-only";

import { readAIConfig, type AIConfig } from "./config";
import { createGeminiProvider } from "./providers/gemini";
import { AIError, type AIChatRequest, type AIProvider } from "./types";

export { AIError, httpStatusForAIError } from "./types";
export type { AIChatRequest, AIMessage, AIProvider } from "./types";

const PROVIDERS: Record<string, (config: AIConfig) => AIProvider> = {
  gemini: createGeminiProvider,
};

/**
 * Resolves the configured provider. Adding a provider means adding a file
 * under `./providers/`, one entry above, and one case in `config.ts`.
 */
export function getAIProvider(): AIProvider {
  const config = readAIConfig();
  const factory = PROVIDERS[config.provider];
  if (!factory) throw new AIError("not_configured");
  return factory(config);
}

/** Runs a request to completion and returns the full text (for short background tasks). */
export async function completeText(
  provider: AIProvider,
  request: AIChatRequest,
): Promise<string> {
  let text = "";
  for await (const delta of provider.streamChat(request)) text += delta;
  return text;
}
