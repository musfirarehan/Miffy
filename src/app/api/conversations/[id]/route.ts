import {
  deleteConversation,
  getConversation,
  renameConversation,
} from "@/features/conversations/service";
import {
  ApiError,
  apiHandler,
  isRecord,
  jsonResponse,
  readJsonBody,
  requireUuid,
} from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { MAX_TITLE_CHARS } from "@/types/conversation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_request, { params }) => {
  const id = requireUuid((await params).id);
  const { supabase } = await requireUser();
  return jsonResponse({ conversation: await getConversation(supabase, id) });
});

export const PATCH = apiHandler<Ctx>(async (request, { params }) => {
  const id = requireUuid((await params).id);
  const { supabase } = await requireUser();
  const body = await readJsonBody(request, 2_000);
  const title = isRecord(body) && typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > MAX_TITLE_CHARS) {
    throw new ApiError(400, "invalid_request", `A title must be 1–${MAX_TITLE_CHARS} characters.`);
  }
  return jsonResponse({ conversation: await renameConversation(supabase, id, title) });
});

export const DELETE = apiHandler<Ctx>(async (_request, { params }) => {
  const id = requireUuid((await params).id);
  const { supabase } = await requireUser();
  await deleteConversation(supabase, id);
  return jsonResponse({ ok: true });
});
