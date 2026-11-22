import "server-only";

import type { AIConfig } from "../config";
import { AIError, type AIChatRequest, type AIProvider } from "../types";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 60_000;

interface GeminiChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

function errorForStatus(status: number): AIError {
  if (status === 429) return new AIError("rate_limited");
  if (status === 401 || status === 403) return new AIError("auth");
  if (status === 400 || status === 404) return new AIError("bad_request");
  return new AIError("upstream");
}

function classifyFailure(
  error: unknown,
  callerSignal: AbortSignal | undefined,
  timeout: AbortSignal,
): AIError {
  if (error instanceof AIError) return error;
  if (callerSignal?.aborted) return new AIError("aborted");
  if (timeout.aborted) return new AIError("timeout");
  return new AIError("upstream");
}

function toGeminiBody(request: AIChatRequest) {
  return {
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: request.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
    },
  };
}

/** Pulls the text and any block signal out of one streamed JSON chunk. */
function readChunk(chunk: GeminiChunk): string {
  if (chunk.promptFeedback?.blockReason) throw new AIError("blocked");
  const candidate = chunk.candidates?.[0];
  const text =
    candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text && candidate?.finishReason === "SAFETY") throw new AIError("blocked");
  return text;
}

export function createGeminiProvider(config: AIConfig): AIProvider {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

  return {
    id: "gemini",

    async *streamChat(request) {
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const signal = request.signal
        ? AbortSignal.any([request.signal, timeout])
        : timeout;

      let response: Response;
      try {
        response = await fetch(
          `${baseUrl}/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Header, not a query param, so the key never lands in URLs/logs.
              "x-goog-api-key": config.apiKey,
            },
            body: JSON.stringify(toGeminiBody(request)),
            signal,
          },
        );
      } catch (error) {
        throw classifyFailure(error, request.signal, timeout);
      }

      if (!response.ok || !response.body) {
        await response.body?.cancel().catch(() => undefined);
        throw errorForStatus(response.status);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let emitted = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newline: number;
          while ((newline = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newline).replace(/\r$/, "");
            buffer = buffer.slice(newline + 1);
            const text = parseDataLine(line);
            if (text) {
              emitted = true;
              yield text;
            }
          }
        }
        const tail = parseDataLine(buffer.trim());
        if (tail) {
          emitted = true;
          yield tail;
        }
      } catch (error) {
        throw classifyFailure(error, request.signal, timeout);
      } finally {
        reader.cancel().catch(() => undefined);
      }

      if (!emitted) throw new AIError("empty");
    },
  };
}

function parseDataLine(line: string): string {
  if (!line.startsWith("data:")) return "";
  const payload = line.slice(5).trim();
  if (!payload) return "";
  let chunk: GeminiChunk;
  try {
    chunk = JSON.parse(payload) as GeminiChunk;
  } catch {
    return "";
  }
  return readChunk(chunk);
}
