import "server-only";

import {
  buildAnalysisRequest,
  isExplicitRemember,
  isSensitive,
  looksPersonal,
  parseAnalysis,
} from "@/features/memories/extraction";
import { saveLearnedMemories } from "@/features/memories/service";
import { setTitle } from "@/features/conversations/service";
import { completeText, type AIProvider } from "@/lib/ai";
import type { SupabaseServerClient } from "@/lib/supabase/server";

export interface LearnInput {
  supabase: SupabaseServerClient;
  provider: AIProvider;
  conversationId: string;
  /** True for the first exchange of a conversation: a better title is generated. */
  isNewConversation: boolean;
  userText: string;
  reply: string;
  memoryEnabled: boolean;
  /** Memories already used for this reply, so they are not restated. */
  known: readonly string[];
}

/**
 * Background work after a reply: name the conversation and, when memory is
 * on and the message looks like it contains a lasting personal fact, learn
 * from it. At most ONE extra AI call; skipped entirely when there is nothing
 * to do. Never throws: a failure here must not affect the chat.
 */
export async function learnFromExchange(input: LearnInput): Promise<void> {
  const wantTitle = input.isNewConversation;
  const wantMemories =
    input.memoryEnabled && looksPersonal(input.userText) && !isSensitive(input.userText);
  if (!wantTitle && !wantMemories) return;

  try {
    const raw = await completeText(
      input.provider,
      buildAnalysisRequest({
        userMessage: input.userText,
        assistantReply: input.reply,
        known: input.known,
        wantTitle,
        wantMemories,
      }),
    );
    const analysis = parseAnalysis(raw, { title: wantTitle, memories: wantMemories });

    if (analysis.title) await setTitle(input.supabase, input.conversationId, analysis.title);
    if (analysis.memories.length > 0) {
      await saveLearnedMemories(
        input.supabase,
        analysis.memories,
        isExplicitRemember(input.userText) ? "explicit" : "auto",
      );
    }
  } catch {
    console.error("[assistant] background learning failed");
  }
}
