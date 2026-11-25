# Deploying Bunny AI

Everything is built. The only things you supply are secrets and your own accounts: the Gemini API key and a (free) Supabase project. This guide is the complete path from clone to a working app.

## 1. Supabase (database + login)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste the contents of `supabase/migrations/20261124000000_init.sql` → Run. This creates the tables, Row Level Security policies and search functions.
3. **Authentication → Providers → Email**: keep Email enabled, then **turn off "Allow new users to sign up"** (Authentication → Sign In / Providers). This is a private app.
4. **Authentication → Users → Add user**: create your own user (email + password, tick "Auto Confirm User").
5. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**. (Never use the service-role key; the app doesn't need it.)

## 2. Environment variables

Copy `.env.example` to `.env.local` for local use, or add the same names in Vercel:

| Variable | Value |
| --- | --- |
| `GEMINI_API_KEY` | Your key from [Google AI Studio](https://aistudio.google.com) |
| `AI_MODEL` | A current Gemini model ID (see Google's model list; a Flash-class model is fine) |
| `AI_PROVIDER` | `gemini` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from step 1 |
| `ALLOWED_USER_EMAIL` | (optional) your email; extra lock even if sign-ups are re-enabled |

`NEXT_PUBLIC_*` values are baked in at **build** time, so set them before building/deploying (on Vercel, add them, then redeploy).

## 3. Run locally

```bash
npm install
npm run build && npm start     # or: npm run dev
npm test                       # unit tests
```

Open http://localhost:3000, sign in with the user from step 1.

## 4. Deploy to Vercel

1. Import the GitHub repo in Vercel (framework: Next.js, defaults are fine).
2. Add the environment variables above (all environments).
3. Deploy. The chat route sets `maxDuration = 60`, the Hobby-plan limit; very long replies could be cut at that point.
4. Rate limiting is in memory per server instance, a best-effort guard rather than a hard global limit.

## 5. Windows desktop app (floating companion)

The desktop app is a thin Tauri shell around your **deployed** site: a main window, a transparent always-on-top draggable companion (click it to expand into a mini chat), a tray icon (left-click toggles the companion; right-click for Open / Show-hide / Keep on top / Quit), and remembered window size/position. Closing the main window keeps Bunny in the tray.

**Easiest: build it on GitHub.**
1. Repo → Settings → Secrets and variables → Actions → **Variables** → add `BUNNY_APP_URL` = your Vercel URL (e.g. `https://your-app.vercel.app`).
2. Actions → **Windows desktop build** → Run workflow.
3. Download the `.exe` installer from the run's artifacts.

**Or build locally on Windows** (needs Rust and the WebView2 runtime, which Windows 11 includes):

```powershell
cd desktop
npm install
$env:BUNNY_APP_URL = "https://your-app.vercel.app"
npm run build      # installer in src-tauri\target\release\bundle\nsis
# development against a local server:  $env:BUNNY_APP_URL="http://localhost:3000"; npm run dev
```

The URL is compiled in and is also the only site allowed to call the shell's three desktop commands (resize companion, open main window, hide companion). No shell, file or arbitrary-URL permissions are granted.

## Known limits

- **Voice input** uses the browser's Web Speech API. It works in Chrome and Edge, but the Windows desktop shell (WebView2) may not provide speech recognition; the mic button then shows as unavailable and typing still works. Spoken replies (text-to-speech) work with the system voices.
- **Notifications** use the standard web Notification API, enabled from the bell in the companion (permission is only requested when you click it).
- The Gemini key never reaches the browser; all AI calls go through `/api/chat`.
