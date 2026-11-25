# Miffy — Bunny AI

Bunny AI is a private personal AI companion: a witty, honest, slightly savage best friend who happens to be a cute bunny. Built with Next.js (App Router), React, strict TypeScript and Tailwind CSS.

## Status

All planned features are implemented:

- Original SVG bunny avatar with 10 expressions; responsive chat UI.
- Provider-agnostic AI layer (Gemini), configurable personality (`BUNNY_SASS_LEVEL` / settings), validated and rate-limited streaming `POST /api/chat`.
- Supabase auth (single private user), saved conversations with search/rename/delete, long-term memory (viewable, editable, deletable, can be turned off), user settings, all protected by Row Level Security.
- Voice: push-to-talk speech input, spoken replies with play/pause/stop, voice/speed/pitch settings, mute, hands-free voice conversation mode.
- Windows desktop companion (Tauri): floating transparent always-on-top bunny that expands to a mini chat, tray icon, notifications.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for setup (Supabase, env vars, Vercel, Windows installer). You only need to supply your own keys.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
npm test         # unit tests
```

## Configure the AI

1. Copy `.env.example` to `.env.local` (never commit it).
2. Create an API key in [Google AI Studio](https://aistudio.google.com) and set `GEMINI_API_KEY`.
3. Set `AI_MODEL` to a current Gemini model ID from Google's model list.
4. Restart `npm run dev`.

Without these, the chat shows a clear "AI isn't set up yet" message instead of replying. Supabase variables are also required; see DEPLOYMENT.md.

## Where things live

- `src/lib/ai/`: provider interface, config, and `providers/gemini.ts` (the only vendor-specific code).
- `src/features/assistant/`: personality (`personality.ts`), core rules, prompt and context builder, browser stream client.
- `src/app/api/chat/route.ts`: the chat endpoint. Tune limits in `src/config/chat-api.ts`.
- `BUNNY_SASS_LEVEL` (`gentle`, `balanced`, `savage`) changes how much Bunny teases.

- `src/features/memories/`, `src/features/voice/`, `src/features/desktop/`: memory service, voice hooks, desktop bridge.
- `supabase/migrations/`: database schema and RLS. `desktop/`: Tauri Windows shell. `tests/`: unit tests.
