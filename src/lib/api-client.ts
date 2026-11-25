import type { ApiErrorBody } from "@/types/api";
import { hardNavigate } from "@/lib/utilities/navigation";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

/** Where signed-out users are sent; set once so every hook behaves the same. */
function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    hardNavigate("/login");
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

/** Typed JSON fetch for the app's own API. Throws ApiClientError with a safe message. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiClientError(0, "network", "Couldn’t reach Bunny. Check your connection.");
  }

  if (response.status === 401) {
    redirectToLogin();
    throw new ApiClientError(401, "unauthorized", "Please sign in.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? "http_error",
      body?.error?.message ?? "Something went wrong. Try again.",
    );
  }
  return (await response.json()) as T;
}
