import "server-only";

import { readAIConfig, type AIConfig } from "./config";
import { createGeminiProvider } from "./providers/gemini";
import { AIError, type AIProvider } from "./types";

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
