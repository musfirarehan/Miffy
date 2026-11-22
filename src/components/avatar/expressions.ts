import type { BunnyExpression } from "@/types/avatar";

/** Ear rotation in degrees. Left ear: negative = outward. Right ear: positive = outward. */
export const EAR_POSE: Record<BunnyExpression, { left: number; right: number }> =
  {
    idle: { left: -5, right: 5 },
    happy: { left: -9, right: 9 },
    excited: { left: -14, right: 14 },
    thinking: { left: -4, right: 13 },
    listening: { left: -1, right: 1 },
    speaking: { left: -6, right: 6 },
    confused: { left: -26, right: 8 },
    sleepy: { left: -30, right: 30 },
    sad: { left: -34, right: 34 },
    mischievous: { left: -8, right: 17 },
  };

/** Expressions whose eyes are open dots and therefore blink. */
export const BLINKING: ReadonlySet<BunnyExpression> = new Set([
  "idle",
  "excited",
  "thinking",
  "listening",
  "speaking",
  "confused",
  "sad",
]);

/** Expressions that get the occasional idle ear twitch. */
export const EAR_TWITCH: ReadonlySet<BunnyExpression> = new Set([
  "idle",
  "happy",
]);

/** Plain-language description used for the accessible label. */
export const EXPRESSION_LABEL: Record<BunnyExpression, string> = {
  idle: "relaxed",
  happy: "happy",
  excited: "excited",
  thinking: "thinking",
  listening: "listening",
  speaking: "speaking",
  confused: "confused",
  sleepy: "sleepy",
  sad: "sad",
  mischievous: "up to something",
};
