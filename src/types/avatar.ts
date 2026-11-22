export const BUNNY_EXPRESSIONS = [
  "idle",
  "happy",
  "excited",
  "thinking",
  "listening",
  "speaking",
  "confused",
  "sleepy",
  "sad",
  "mischievous",
] as const;

export type BunnyExpression = (typeof BUNNY_EXPRESSIONS)[number];
