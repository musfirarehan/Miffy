import { createConversation, listConversations } from "@/features/conversations/service";
import { apiHandler, jsonResponse } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";

/** GET /api/conversations?q=  → newest first; `q` searches titles and message text. */
export const GET = apiHandler(async (request) => {
  const { supabase } = await requireUser();
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  return jsonResponse({ conversations: await listConversations(supabase, q) });
});

/** POST /api/conversations → a fresh, empty conversation. */
export const POST = apiHandler(async () => {
  const { supabase } = await requireUser();
  return jsonResponse({ conversation: await createConversation(supabase) }, 201);
});
