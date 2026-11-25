import {
  createMemory,
  deleteAllMemories,
  listMemories,
  parseMemoryInput,
} from "@/features/memories/service";
import { apiHandler, jsonResponse, readJsonBody } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";

export const GET = apiHandler(async () => {
  const { supabase } = await requireUser();
  return jsonResponse({ memories: await listMemories(supabase) });
});

export const POST = apiHandler(async (request) => {
  const { supabase } = await requireUser();
  const input = parseMemoryInput(await readJsonBody(request, 5_000));
  return jsonResponse({ memory: await createMemory(supabase, input, "manual") }, 201);
});

/** DELETE /api/memories?all=true → forget everything. */
export const DELETE = apiHandler(async (request) => {
  const { supabase } = await requireUser();
  if (new URL(request.url).searchParams.get("all") !== "true") {
    return jsonResponse({ error: { code: "invalid_request", message: "Pass ?all=true to clear all memories." } }, 400);
  }
  await deleteAllMemories(supabase);
  return jsonResponse({ ok: true });
});
