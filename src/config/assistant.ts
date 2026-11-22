/**
 * Static assistant configuration. Personality instructions will live in
 * their own configurable module in Phase 3; this file only holds
 * presentation-level settings for the UI.
 */
export const ASSISTANT_NAME = "Bunny";
export const APP_NAME = "Bunny AI";

/** Upper bound for a single user message. Enforced again server-side later. */
export const MAX_MESSAGE_LENGTH = 4000;

/** Show the character counter once the draft gets this long. */
export const COUNTER_THRESHOLD = 3500;

export const STARTER_PROMPTS: readonly string[] = [
  "Help me plan my day",
  "I have an exam tomorrow and haven’t studied",
  "Cheer me up, but make it funny",
  "Give me an honest opinion",
];
