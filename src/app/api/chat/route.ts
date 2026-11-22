import { CHAT_RATE_LIMIT, GENERATION, MAX_REQUEST_CHARS } from "@/config/chat-api";
import {
  DEFAULT_PERSONALITY,
  isSassLevel,
  type PersonalityConfig,
} from "@/features/assistant/personality";
import { buildChatContext } from "@/features/assistant/prompt";
import { AIError, getAIProvider, httpStatusForAIError } from "@/lib/ai";
import { createRateLimiter } from "@/lib/utilities/rate-limit";
import { parseChatRequest } from "@/lib/validation/chat";
import type { ChatErrorBody, ChatStreamEvent } from "@/types/chat";

const checkRateLimit = createRateLimiter(CHAT_RATE_LIMIT);
const encoder = new TextEncoder();

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
): Response {
  const body: ChatErrorBody = { error: { code, message } };
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

/** Best-effort client key. Behind Vercel the first forwarded hop is the client. */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

function currentPersonality(): PersonalityConfig {
  const sass = process.env.BUNNY_SASS_LEVEL?.trim().toLowerCase();
  return isSassLevel(sass)
    ? { ...DEFAULT_PERSONALITY, sassLevel: sass }
    : DEFAULT_PERSONALITY;
}

function encodeEvent(event: ChatStreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request): Promise<Response> {
  // A JSON content type forces a CORS preflight for cross-site callers,
  // which this route never approves, so other websites cannot spend our quota.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return errorResponse(415, "unsupported_media_type", "Send JSON.");
  }

  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return errorResponse(
      429,
      "rate_limited",
      "You’re sending messages faster than Bunny can keep up. Give it a moment.",
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const text = await request.text();
  if (text.length > MAX_REQUEST_CHARS) {
    return errorResponse(413, "too_large", "That request is too large.");
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return errorResponse(400, "invalid_json", "The request body isn’t valid JSON.");
  }

  const parsed = parseChatRequest(json);
  if (!parsed.ok) {
    return errorResponse(400, "invalid_request", parsed.message);
  }

  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  let iterator: AsyncGenerator<string, void, void>;
  let first: IteratorResult<string, void>;
  try {
    const provider = getAIProvider();
    const context = buildChatContext({
      messages: parsed.data.messages,
      personality: currentPersonality(),
    });
    iterator = provider.streamChat({
      ...context,
      ...GENERATION,
      signal: abort.signal,
    });
    // Wait for the first chunk so failures that happen before any text
    // (bad key, rate limit, blocked prompt) can use a real HTTP status.
    first = await iterator.next();
  } catch (error) {
    const aiError = error instanceof AIError ? error : new AIError("upstream");
    // Only the error code is logged, never message content.
    console.error(`[api/chat] ${aiError.code}`);
    return errorResponse(
      httpStatusForAIError(aiError.code),
      aiError.code,
      aiError.message,
    );
  }

  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let result = first;
        while (!result.done && !cancelled) {
          controller.enqueue(encodeEvent({ type: "delta", text: result.value }));
          result = await iterator.next();
        }
        if (!cancelled) controller.enqueue(encodeEvent({ type: "done" }));
      } catch (error) {
        const aiError = error instanceof AIError ? error : new AIError("upstream");
        if (!cancelled) {
          console.error(`[api/chat] stream ${aiError.code}`);
          controller.enqueue(
            encodeEvent({ type: "error", code: aiError.code, message: aiError.message }),
          );
        }
      } finally {
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
    },
  });
}
