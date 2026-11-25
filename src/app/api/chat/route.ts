import { after } from "next/server";

import {
  CHAT_RATE_LIMIT,
  GENERATION,
} from "@/config/chat-api";
import { MAX_MESSAGE_LENGTH } from "@/config/assistant";
import { DEFAULT_PERSONALITY } from "@/features/assistant/personality";
import { learnFromExchange } from "@/features/assistant/post-process";
import { buildChatContext } from "@/features/assistant/prompt";
import {
  addMessage,
  assertConversation,
  createConversation,
  discardTrailingAssistantMessages,
  loadHistory,
  titleFromMessage,
} from "@/features/conversations/service";
import { retrieveMemories } from "@/features/memories/retrieval";
import { getSettings } from "@/features/settings/service";
import { AIError, getAIProvider, httpStatusForAIError } from "@/lib/ai";
import {
  ApiError,
  apiHandler,
  errorResponse,
  isRecord,
  isUuid,
  readJsonBody,
} from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { createRateLimiter } from "@/lib/utilities/rate-limit";
import type { ChatStreamEvent } from "@/types/chat";

const checkRateLimit = createRateLimiter(CHAT_RATE_LIMIT);
const encoder = new TextEncoder();
const MAX_REPLY_CHARS = 20_000;

interface ChatBody {
  conversationId: string | null;
  message: string | null;
  regenerate: boolean;
}

function parseBody(raw: unknown): ChatBody {
  if (!isRecord(raw)) throw new ApiError(400, "invalid_request", "Expected an object.");
  const conversationId = raw.conversationId ?? null;
  if (conversationId !== null && !isUuid(conversationId)) {
    throw new ApiError(400, "invalid_request", "conversationId isn’t valid.");
  }
  const regenerate = raw.regenerate === true;

  if (regenerate) {
    if (!conversationId) {
      throw new ApiError(400, "invalid_request", "Nothing to retry yet.");
    }
    return { conversationId, message: null, regenerate };
  }

  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  if (!message) throw new ApiError(400, "invalid_request", "Say something first.");
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(
      400,
      "invalid_request",
      `That message is too long (max ${MAX_MESSAGE_LENGTH} characters).`,
    );
  }
  return { conversationId, message, regenerate };
}

const encodeEvent = (event: ChatStreamEvent): Uint8Array =>
  encoder.encode(`${JSON.stringify(event)}\n`);

/**
 * POST /api/chat
 *
 * Body: { conversationId?: uuid | null, message?: string, regenerate?: boolean }
 *
 * The server loads the conversation history itself (the client is never
 * trusted to supply it), saves the user's message and Bunny's reply, and
 * streams the reply as NDJSON. `regenerate: true` re-answers the last user
 * message, replacing a failed or partial reply.
 */
/** Streaming replies can run long; Vercel Hobby caps this at 60s. */
export const maxDuration = 60;

export const POST = apiHandler(async (request) => {
  const { supabase, user } = await requireUser();

  const limit = checkRateLimit(user.id);
  if (!limit.allowed) {
    return errorResponse(
      429,
      "rate_limited",
      "You’re sending messages faster than Bunny can keep up. Give it a moment.",
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const body = parseBody(await readJsonBody(request, 20_000));
  const settings = await getSettings(supabase);

  // --- Resolve the conversation and persist the user's turn ---------------
  let conversationId: string;
  let title = "";
  let isNew = false;
  let userText: string;

  if (body.regenerate) {
    conversationId = body.conversationId as string;
    const lastUser = await discardTrailingAssistantMessages(supabase, conversationId);
    if (lastUser === null) {
      throw new ApiError(404, "not_found", "There’s nothing to retry in that conversation.");
    }
    userText = lastUser;
  } else {
    userText = body.message as string;
    if (body.conversationId) {
      await assertConversation(supabase, body.conversationId);
      conversationId = body.conversationId;
    } else {
      const created = await createConversation(supabase, titleFromMessage(userText));
      conversationId = created.id;
      title = created.title;
      isNew = true;
    }
    await addMessage(supabase, conversationId, "user", userText);
  }

  const idHeader = { "X-Conversation-Id": conversationId };

  // --- Build the prompt: history from the database + relevant memories ----
  const history = await loadHistory(supabase, conversationId);
  let memories: string[] = [];
  if (settings.memoryEnabled) {
    try {
      memories = (await retrieveMemories(supabase, userText)).map((m) => m.content);
    } catch {
      // Memory is an enhancement; a failure here must not block the reply.
    }
  }
  const context = buildChatContext({
    messages: history,
    memories,
    addressName: settings.displayName,
    personality: { ...DEFAULT_PERSONALITY, sassLevel: settings.sassLevel },
  });

  // --- Start the provider; fail early with a real status if it can't ------
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  let provider: ReturnType<typeof getAIProvider>;
  let iterator: AsyncGenerator<string, void, void>;
  let first: IteratorResult<string, void>;
  try {
    provider = getAIProvider();
    iterator = provider.streamChat({ ...context, ...GENERATION, signal: abort.signal });
    first = await iterator.next();
  } catch (error) {
    const aiError = error instanceof AIError ? error : new AIError("upstream");
    console.error(`[api/chat] ${aiError.code}`);
    return errorResponse(
      httpStatusForAIError(aiError.code),
      aiError.code,
      aiError.message,
      idHeader,
    );
  }

  // --- Stream, then save the reply and learn in the background ------------
  let reply = "";
  let cancelled = false;
  let resolveReply: (text: string) => void = () => undefined;
  const replyDone = new Promise<string>((resolve) => (resolveReply = resolve));

  after(async () => {
    const text = await replyDone;
    if (!text.trim()) return;
    await learnFromExchange({
      supabase,
      provider,
      conversationId,
      isNewConversation: isNew,
      userText,
      reply: text,
      memoryEnabled: settings.memoryEnabled,
      known: memories,
    });
  });

  const persistReply = async () => {
    if (!reply.trim()) return;
    try {
      await addMessage(supabase, conversationId, "assistant", reply.slice(0, MAX_REPLY_CHARS));
    } catch {
      console.error("[api/chat] could not save reply");
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encodeEvent({ type: "meta", conversationId, title, isNew }));
        let result = first;
        while (!result.done && !cancelled) {
          reply += result.value;
          controller.enqueue(encodeEvent({ type: "delta", text: result.value }));
          result = await iterator.next();
        }
        await persistReply();
        if (!cancelled) controller.enqueue(encodeEvent({ type: "done" }));
      } catch (error) {
        const aiError = error instanceof AIError ? error : new AIError("upstream");
        // Keep what the user already saw, so a retry replaces it cleanly.
        await persistReply();
        if (!cancelled) {
          console.error(`[api/chat] stream ${aiError.code}`);
          controller.enqueue(
            encodeEvent({ type: "error", code: aiError.code, message: aiError.message }),
          );
        }
      } finally {
        resolveReply(reply);
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      ...idHeader,
    },
  });
});
