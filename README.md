# Miffy — Bunny AI

Bunny AI is a private personal AI companion: a witty, honest, slightly savage best friend who happens to be a cute bunny. Built with Next.js (App Router), React, strict TypeScript and Tailwind CSS.

## Status

- **Phases 1–2 (done):** foundation, original SVG bunny avatar with 10 expressions, responsive chat UI.
- **Phase 3 (done):** provider-agnostic AI layer with a Gemini provider, configurable personality, validated and rate-limited streaming `POST /api/chat`, and a UI with streaming, Stop, error states and Retry.
- **Next:** Phase 4 (Supabase persistence: conversations, long-term memory, settings). There is no database or voice yet; conversations live in memory and are lost on refresh.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Configure the AI

1. Copy `.env.example` to `.env.local` (never commit it).
2. Create an API key in [Google AI Studio](https://aistudio.google.com) and set `GEMINI_API_KEY`.
3. Set `AI_MODEL` to a current Gemini model ID from Google's model list.
4. Restart `npm run dev`.

Without these, the chat shows a clear "AI isn't set up yet" message instead of replying.

## Where things live

- `src/lib/ai/`: provider interface, config, and `providers/gemini.ts` (the only vendor-specific code).
- `src/features/assistant/`: personality (`personality.ts`), core rules, prompt and context builder, browser stream client.
- `src/app/api/chat/route.ts`: the chat endpoint. Tune limits in `src/config/chat-api.ts`.
- `BUNNY_SASS_LEVEL` (`gentle`, `balanced`, `savage`) changes how much Bunny teases.
