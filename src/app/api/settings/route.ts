import { getSettings, parseSettingsPatch, updateSettings } from "@/features/settings/service";
import { apiHandler, jsonResponse, readJsonBody } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";

export const GET = apiHandler(async () => {
  const { supabase, user } = await requireUser();
  return jsonResponse({
    settings: await getSettings(supabase),
    // Shown in Settings so the signed-in account is visible.
    account: { email: user.email ?? null },
  });
});

export const PATCH = apiHandler(async (request) => {
  const { supabase, user } = await requireUser();
  const patch = parseSettingsPatch(await readJsonBody(request, 5_000));
  return jsonResponse({ settings: await updateSettings(supabase, user.id, patch) });
});
