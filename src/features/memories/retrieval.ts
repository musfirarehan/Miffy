import "server-only";

import { dbError } from "@/lib/api/db";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import type { Memory } from "@/types/memory";

import { mapMemoryRows } from "./service";

const STOPWORDS = new Set(
  (
    "the and for are but not you your yours with this that these those have has had was were will would " +
    "can could should about from into onto over under then than them they their there here what when where " +
    "which who whom why how all any some more most much many just like also very really still only even " +
    "been being does did doing done get got getting let its our out off too now one two new"
  ).split(" "),
);

const MAX_QUERY_WORDS = 12;

/**
 * Turns free text into a safe tsquery string: only letters and digits
 * survive, so user input can never inject tsquery operators. Words are
 * OR-ed so any overlap with a memory counts.
 */
export function buildMemoryQuery(text: string): string {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  const unique: string[] = [];
  for (const word of words) {
    if (STOPWORDS.has(word) || unique.includes(word)) continue;
    unique.push(word);
    if (unique.length >= MAX_QUERY_WORDS) break;
  }
  return unique.join(" | ");
}

/**
 * Relevant memories for the current message: identity and communication
 * memories always apply, everything else must overlap with what the user
 * just said. Never returns the whole memory store.
 */
export async function retrieveMemories(
  supabase: SupabaseServerClient,
  userText: string,
  limit = 8,
): Promise<Memory[]> {
  const { data, error } = await supabase.rpc("match_memories", {
    query_text: buildMemoryQuery(userText),
    max_results: limit,
  });
  if (error) throw dbError(error, "retrieve memories");
  return mapMemoryRows(data as Parameters<typeof mapMemoryRows>[0]);
}
