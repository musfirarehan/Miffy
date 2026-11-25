import {
  deleteMemory,
  parseMemoryInput,
  updateMemory,
} from "@/features/memories/service";
import { apiHandler, jsonResponse, readJsonBody, requireUuid } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiHandler<Ctx>(async (request, { params }) => {
  const id = requireUuid((await params).id);
  const { supabase } = await requireUser();
  const patch = parseMemoryInput(await readJsonBody(request, 5_000), true);
  return jsonResponse({ memory: await updateMemory(supabase, id, patch) });
});

export const DELETE = apiHandler<Ctx>(async (_request, { params }) => {
  const id = requireUuid((await params).id);
  const { supabase } = await requireUser();
  await deleteMemory(supabase, id);
  return jsonResponse({ ok: true });
});
