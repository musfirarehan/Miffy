import "server-only";

import { MAX_CONTEXT_MESSAGES } from "@/config/chat-api";
import { dbError, toMillis } from "@/lib/api/db";
import { ApiError } from "@/lib/api/http";
import type { AIMessage } from "@/lib/ai";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import type { ChatMessage, ChatRole } from "@/types/chat";
import type {
  ConversationDetail,
  ConversationSummary,
} from "@/types/conversation";

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

const CONVERSATION_COLUMNS = "id, title, created_at, updated_at";
const MESSAGE_COLUMNS = "id, role, content, created_at";
const MAX_MESSAGES_PER_FETCH = 500;

const toSummary = (row: ConversationRow): ConversationSummary => ({
  id: row.id,
  title: row.title,
  createdAt: toMillis(row.created_at),
  updatedAt: toMillis(row.updated_at),
});

const toMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  role: row.role,
  content: row.content,
  createdAt: toMillis(row.created_at),
});

/** Newest first. A non-empty `query` searches titles and message text. */
export async function listConversations(
  supabase: SupabaseServerClient,
  query?: string,
): Promise<ConversationSummary[]> {
  const q = query?.trim();
  if (q) {
    const { data, error } = await supabase
      .rpc("search_conversations", { query: q.slice(0, 100), max_results: 50 })
      .select(CONVERSATION_COLUMNS);
    if (error) throw dbError(error, "search conversations");
    return (data as ConversationRow[]).map(toSummary);
  }
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw dbError(error, "list conversations");
  return (data as ConversationRow[]).map(toSummary);
}

export async function getConversation(
  supabase: SupabaseServerClient,
  id: string,
): Promise<ConversationDetail> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw dbError(error, "get conversation");
  // Row Level Security hides other users' rows, so "not yours" looks identical to "missing".
  if (!data) throw new ApiError(404, "not_found", "That conversation doesn’t exist.");

  const { data: rows, error: messagesError } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES_PER_FETCH);
  if (messagesError) throw dbError(messagesError, "get messages");

  return {
    ...toSummary(data as ConversationRow),
    messages: (rows as MessageRow[]).map(toMessage),
  };
}

/** Throws 404 unless the conversation exists and belongs to the caller (RLS). */
export async function assertConversation(
  supabase: SupabaseServerClient,
  id: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw dbError(error, "check conversation");
  if (!data) throw new ApiError(404, "not_found", "That conversation doesn’t exist.");
}

export async function createConversation(
  supabase: SupabaseServerClient,
  title?: string,
): Promise<ConversationSummary> {
  const { data, error } = await supabase
    .from("conversations")
    .insert(title ? { title } : {})
    .select(CONVERSATION_COLUMNS)
    .single();
  if (error) throw dbError(error, "create conversation");
  return toSummary(data as ConversationRow);
}

export async function renameConversation(
  supabase: SupabaseServerClient,
  id: string,
  title: string,
): Promise<ConversationSummary> {
  const { data, error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", id)
    .select(CONVERSATION_COLUMNS)
    .maybeSingle();
  if (error) throw dbError(error, "rename conversation");
  if (!data) throw new ApiError(404, "not_found", "That conversation doesn’t exist.");
  return toSummary(data as ConversationRow);
}

export async function deleteConversation(
  supabase: SupabaseServerClient,
  id: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw dbError(error, "delete conversation");
  if (!data || data.length === 0) {
    throw new ApiError(404, "not_found", "That conversation doesn’t exist.");
  }
}

export async function addMessage(
  supabase: SupabaseServerClient,
  conversationId: string,
  role: ChatRole,
  content: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role, content })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw dbError(error, "add message");
  return toMessage(data as MessageRow);
}

/** The newest turns, oldest first, as the AI layer expects them. */
export async function loadHistory(
  supabase: SupabaseServerClient,
  conversationId: string,
  limit = MAX_CONTEXT_MESSAGES + 10,
): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw dbError(error, "load history");
  return (data as AIMessage[]).reverse();
}

/**
 * Removes assistant replies that come after the last user message, so a
 * retry replaces a failed or partial answer instead of stacking on it.
 * Returns the last user message's text (or null if there is none).
 */
export async function discardTrailingAssistantMessages(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<string | null> {
  const { data: lastUser, error } = await supabase
    .from("messages")
    .select("content, created_at")
    .eq("conversation_id", conversationId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw dbError(error, "find last user message");
  if (!lastUser) return null;

  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("role", "assistant")
    .gt("created_at", (lastUser as { created_at: string }).created_at);
  if (deleteError) throw dbError(deleteError, "discard assistant messages");
  return (lastUser as { content: string }).content;
}

export async function setTitle(
  supabase: SupabaseServerClient,
  id: string,
  title: string,
): Promise<void> {
  const { error } = await supabase.from("conversations").update({ title }).eq("id", id);
  if (error) throw dbError(error, "set title");
}

/** A readable placeholder title until a better one is generated. */
export function titleFromMessage(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 48) return clean || "New conversation";
  return `${clean.slice(0, 47).trimEnd()}…`;
}
