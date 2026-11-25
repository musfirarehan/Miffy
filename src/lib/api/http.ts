import type { ApiErrorBody } from "@/types/api";

/**
 * A failure with a safe, user-facing message. Anything that is not an
 * ApiError is treated as a bug: it is logged by code only and answered with
 * a generic 500, so internals never reach the browser.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Wraps a route handler so thrown ApiErrors become clean JSON responses. */
export function apiHandler<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.status, error.code, error.message);
      }
      // Never log message content or stack traces that may embed user data.
      console.error(`[api] unhandled ${request.method} ${new URL(request.url).pathname}`);
      return errorResponse(500, "internal", "Something went wrong on our side.");
    }
  };
}

/** Reads and validates a JSON request body with a size cap. */
export async function readJsonBody(
  request: Request,
  maxChars = 50_000,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Send JSON.");
  }
  const text = await request.text();
  if (text.length > maxChars) {
    throw new ApiError(413, "too_large", "That request is too large.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "The request body isn’t valid JSON.");
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function requireUuid(value: unknown): string {
  if (!isUuid(value)) throw new ApiError(400, "invalid_id", "That id isn’t valid.");
  return value;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
