export const MEMORY_CATEGORIES = [
  "name",
  "communication",
  "interest",
  "project",
  "goal",
  "tool",
  "preference",
  "other",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  name: "Name & address",
  communication: "Communication style",
  interest: "Interests",
  project: "Projects",
  goal: "Goals",
  tool: "Tools",
  preference: "Preferences",
  other: "Other",
};

/** `manual`: added by the user. `explicit`: the user said "remember…". `auto`: learned by Bunny. */
export type MemorySource = "manual" | "explicit" | "auto";

export interface Memory {
  id: string;
  category: MemoryCategory;
  content: string;
  source: MemorySource;
  createdAt: number;
  updatedAt: number;
}

export const MAX_MEMORY_CHARS = 500;
/** Hard cap so automatic learning can never grow without bound. */
export const MAX_MEMORIES_PER_USER = 200;
