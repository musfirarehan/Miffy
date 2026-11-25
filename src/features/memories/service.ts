import "server-only";

import { dbError, toMillis } from "@/lib/api/db";
import { ApiError, isRecord } from "@/lib/api/http";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import {
  MAX_MEMORIES_PER_USER,
  MAX_MEMORY_CHARS,
  MEMORY_CATEGORIES,
  type Memory,
  type MemoryCategory,
  type MemorySource,
} from "@/types/memory";

interface MemoryRow {
  id: string;
  category: MemoryCategory;
  content: string;
  source: MemorySource;
  created_at: string;
  updated_at: string;
}

const COLUMNS = "id, category, content, source, created_at, updated_at";
const UNIQUE_VIOLATION = "23505";

const toMemory = (row: MemoryRow): Memory => ({
  id: row.id,
  category: row.category,
  content: row.content,
  source: row.source,
  createdAt: toMillis(row.created_at),
  updatedAt: toMillis(row.updated_at),
});

export const mapMemoryRows = (rows: MemoryRow[]): Memory[] => rows.map(toMemory);

export async function listMemories(supabase: SupabaseServerClient): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("memories")
    .select(COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(MAX_MEMORIES_PER_USER);
  if (error) throw dbError(error, "list memories");
  return mapMemoryRows(data as MemoryRow[]);
}

export async function countMemories(supabase: SupabaseServerClient): Promise<number> {
  const { count, error } = await supabase
    .from("memories")
    .select("id", { count: "exact", head: true });
  if (error) throw dbError(error, "count memories");
  return count ?? 0;
}

export interface MemoryInput {
  category: MemoryCategory;
  content: string;
}

/** Validates a create body (`partial` = update, where every field is optional). */
export function parseMemoryInput(body: unknown, partial: true): Partial<MemoryInput>;
export function parseMemoryInput(body: unknown, partial?: false): MemoryInput;
export function parseMemoryInput(body: unknown, partial = false): Partial<MemoryInput> {
  if (!isRecord(body)) throw new ApiError(400, "invalid_request", "Expected an object.");
  const out: Partial<MemoryInput> = {};

  if (body.content !== undefined || !partial) {
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content || content.length > MAX_MEMORY_CHARS) {
      throw new ApiError(
        400,
        "invalid_request",
        `A memory must be 1–${MAX_MEMORY_CHARS} characters.`,
      );
    }
    out.content = content;
  }
  if (body.category !== undefined || !partial) {
    const category = body.category ?? "other";
    if (!MEMORY_CATEGORIES.includes(category as MemoryCategory)) {
      throw new ApiError(400, "invalid_request", "That category isn’t valid.");
    }
    out.category = category as MemoryCategory;
  }
  if (partial && Object.keys(out).length === 0) {
    throw new ApiError(400, "invalid_request", "Nothing to update.");
  }
  return out;
}

const duplicate = () =>
  new ApiError(409, "duplicate", "Bunny already remembers that.");

export async function createMemory(
  supabase: SupabaseServerClient,
  input: MemoryInput,
  source: MemorySource = "manual",
): Promise<Memory> {
  if ((await countMemories(supabase)) >= MAX_MEMORIES_PER_USER) {
    throw new ApiError(
      409,
      "memory_limit",
      `Memory is full (${MAX_MEMORIES_PER_USER}). Delete a few to add more.`,
    );
  }
  const { data, error } = await supabase
    .from("memories")
    .insert({ ...input, source })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw duplicate();
    throw dbError(error, "create memory");
  }
  return toMemory(data as MemoryRow);
}

export async function updateMemory(
  supabase: SupabaseServerClient,
  id: string,
  patch: Partial<MemoryInput>,
): Promise<Memory> {
  const { data, error } = await supabase
    .from("memories")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw duplicate();
    throw dbError(error, "update memory");
  }
  if (!data) throw new ApiError(404, "not_found", "That memory doesn’t exist.");
  return toMemory(data as MemoryRow);
}

export async function deleteMemory(
  supabase: SupabaseServerClient,
  id: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw dbError(error, "delete memory");
  if (!data || data.length === 0) {
    throw new ApiError(404, "not_found", "That memory doesn’t exist.");
  }
}

export async function deleteAllMemories(supabase: SupabaseServerClient): Promise<void> {
  // RLS limits this to the caller's rows; the filter is required by PostgREST.
  const { error } = await supabase
    .from("memories")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00Z");
  if (error) throw dbError(error, "delete all memories");
}

/**
 * Saves automatically learned memories. Duplicates and a full memory are
 * skipped silently: learning is best effort and must never break a chat.
 */
export async function saveLearnedMemories(
  supabase: SupabaseServerClient,
  items: MemoryInput[],
  source: Exclude<MemorySource, "manual">,
): Promise<number> {
  let saved = 0;
  for (const item of items) {
    try {
      await createMemory(supabase, item, source);
      saved += 1;
    } catch (error) {
      if (error instanceof ApiError && (error.code === "duplicate" || error.code === "memory_limit")) {
        continue;
      }
      throw error;
    }
  }
  return saved;
}
