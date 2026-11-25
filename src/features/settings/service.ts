import "server-only";

import { dbError } from "@/lib/api/db";
import { ApiError, isRecord } from "@/lib/api/http";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_SETTINGS,
  SASS_LEVELS,
  type SassLevel,
  type UserSettings,
} from "@/types/settings";

interface SettingsRow {
  display_name: string | null;
  memory_enabled: boolean;
  sass_level: SassLevel;
  voice_uri: string | null;
  voice_rate: number;
  voice_pitch: number;
  auto_speak: boolean;
  voice_muted: boolean;
}

const COLUMNS =
  "display_name, memory_enabled, sass_level, voice_uri, voice_rate, voice_pitch, auto_speak, voice_muted";

const fromRow = (row: SettingsRow): UserSettings => ({
  displayName: row.display_name,
  memoryEnabled: row.memory_enabled,
  sassLevel: row.sass_level,
  voiceUri: row.voice_uri,
  voiceRate: row.voice_rate,
  voicePitch: row.voice_pitch,
  autoSpeak: row.auto_speak,
  voiceMuted: row.voice_muted,
});

export async function getSettings(
  supabase: SupabaseServerClient,
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw dbError(error, "get settings");
  return data ? fromRow(data as SettingsRow) : DEFAULT_SETTINGS;
}

/** Only known fields are accepted; everything is range-checked. */
export function parseSettingsPatch(body: unknown): Partial<SettingsRow> {
  if (!isRecord(body)) throw new ApiError(400, "invalid_request", "Expected an object.");
  const patch: Partial<SettingsRow> = {};
  const bad = (field: string) =>
    new ApiError(400, "invalid_request", `${field} isn’t valid.`);

  if ("displayName" in body) {
    const v = body.displayName;
    if (v === null || (typeof v === "string" && v.trim() === "")) patch.display_name = null;
    else if (typeof v === "string" && v.trim().length <= 60) patch.display_name = v.trim();
    else throw bad("displayName");
  }
  if ("memoryEnabled" in body) {
    if (typeof body.memoryEnabled !== "boolean") throw bad("memoryEnabled");
    patch.memory_enabled = body.memoryEnabled;
  }
  if ("sassLevel" in body) {
    if (!SASS_LEVELS.includes(body.sassLevel as SassLevel)) throw bad("sassLevel");
    patch.sass_level = body.sassLevel as SassLevel;
  }
  if ("voiceUri" in body) {
    const v = body.voiceUri;
    if (v === null || v === "") patch.voice_uri = null;
    else if (typeof v === "string" && v.length <= 300) patch.voice_uri = v;
    else throw bad("voiceUri");
  }
  if ("voiceRate" in body) {
    const v = body.voiceRate;
    if (typeof v !== "number" || !(v >= 0.5 && v <= 2)) throw bad("voiceRate");
    patch.voice_rate = v;
  }
  if ("voicePitch" in body) {
    const v = body.voicePitch;
    if (typeof v !== "number" || !(v >= 0 && v <= 2)) throw bad("voicePitch");
    patch.voice_pitch = v;
  }
  if ("autoSpeak" in body) {
    if (typeof body.autoSpeak !== "boolean") throw bad("autoSpeak");
    patch.auto_speak = body.autoSpeak;
  }
  if ("voiceMuted" in body) {
    if (typeof body.voiceMuted !== "boolean") throw bad("voiceMuted");
    patch.voice_muted = body.voiceMuted;
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, "invalid_request", "Nothing to update.");
  }
  return patch;
}

export async function updateSettings(
  supabase: SupabaseServerClient,
  userId: string,
  patch: Partial<SettingsRow>,
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
    .select(COLUMNS)
    .single();
  if (error) throw dbError(error, "update settings");
  return fromRow(data as SettingsRow);
}
