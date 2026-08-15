# Handover: Taking Ownership of Quick Build

This doc is for a new team (e.g. College of IST IT) taking over Quick Build to run it in their own courses/orientation events, independent of the original developer's accounts.

It covers everything from forking the repo to having your own fully working deployment. If you just want to run the existing local dev docs (not take ownership), see [SETUP.md](SETUP.md) instead — this doc supersedes it for a fresh-ownership setup, and links back to it where the steps overlap.

**Time estimate:** 30–45 minutes, assuming you have (or can quickly create) a GitHub account, a Google Cloud billing-enabled project, and are comfortable clicking through web consoles.

---

## 0. What you're inheriting

Quick Build is a Next.js 14 app: an AI-judged build/draw game show for classroom or orientation use. Full description: [README.md](README.md). Full architecture (file structure, API routes, data model, Supabase schema): [docs/system-architecture.md](docs/system-architecture.md). Known bugs and unfinished work: [docs/pending-tasks.md](docs/pending-tasks.md) — **read this before you present the app live**, it lists what's broken (notably: "Player Upload" QR-code mode isn't finished yet — stick to "Camera" capture mode for now).

Nothing in this app is tied to the original developer's identity or accounts once you complete the steps below — you'll be running it entirely on your own GitHub repo, Google Cloud project, Supabase project, and Vercel project.

---

## 1. Fork the repo into your own ownership

1. Go to the source repo on GitHub and click **Fork** (top right) — this creates a copy under your own GitHub account or organization, which you fully own and control.
2. Clone your fork locally:
   ```bash
   git clone <your-fork-url>
   cd Gemagen-quick-build
   npm install
   ```
3. From here on, all deploys and API keys point at resources *you* create — the original developer's Supabase/Vertex/Vercel projects are not shared and don't need to be involved at all.

---

## 2. Get a Vertex AI (Gemini) API key

The app calls the **Vertex AI REST API** (not the separate Google AI Studio / Gemini API product — the API key format and billing are different, so make sure you're in the right console).

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new Google Cloud project (or use an existing one your department already has billing set up for).
2. Enable the **Vertex AI API** for that project: search "Vertex AI API" in the console search bar → **Enable**.
3. Create an API key: **APIs & Services → Credentials → Create Credentials → API Key**.
4. (Recommended) Restrict the key to the Vertex AI API only, under the key's **API restrictions**.
5. Copy the key — you'll paste it into `.env.local` in Step 4. This is your `VERTEX_API_KEY`.
6. Confirm billing is enabled on the project — Vertex AI calls will fail without it. A typical 4-player game costs well under $1 in API calls (a handful of Gemini 2.5 Flash calls per game).

---

## 3. Create a Supabase project (database + realtime + storage)

1. Go to [supabase.com](https://supabase.com) and create a free account (or use your department's existing org) → **New Project**.
2. Once the project is provisioned, open the **SQL Editor** and create the `games` and `players` tables per the schema documented in [docs/system-architecture.md](docs/system-architecture.md#supabase-schema) — copy those column definitions into a `CREATE TABLE` statement for each.
3. Create a **Storage** bucket named `player-photos` (Storage → New Bucket). This holds camera-mode frame captures and player photo uploads.
4. Enable **Realtime** on both the `games` and `players` tables: **Database → Replication** → toggle both tables on. The host screen and audience/projector view both depend on Realtime subscriptions to sync live.
5. Under **Project Settings → API**, copy:
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 4. Configure local environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the three values from Steps 2–3:
```
VERTEX_API_KEY=<from step 2>
NEXT_PUBLIC_SUPABASE_URL=<from step 3>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from step 3>
```

Never commit `.env.local` — it's already gitignored.

---

## 5. Verify your setup with one command

Run:
```bash
npm run handoff
```

This checks your Node/npm versions, confirms all three env vars are filled in (not left as placeholders), runs a full install + production build, prints an architecture summary, and surfaces the current known-issues list from `docs/pending-tasks.md` — everything you need to know before your first game, in one command. No Claude Code required.

(If your team does use Claude Code, running the `/handoff` slash command does the same checks interactively.)

Fix anything it flags before moving on. Once it passes clean, run `npm run dev` and open [http://localhost:3000](http://localhost:3000) to confirm the app itself loads and a test game runs end to end locally.

---

## 6. Create a Vercel account and deploy

1. Push your fork's `main` branch to GitHub if you haven't already (it should already be there from Step 1).
2. Go to [vercel.com](https://vercel.com) and sign up (or use your department's existing Vercel team) — sign in with GitHub for the smoothest import flow.
3. **Add New Project** → import your forked repo. Vercel auto-detects Next.js; no build config changes needed.
4. Under **Environment Variables**, add the same three keys from Step 4:
   - `VERTEX_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**. Vercel gives you a `your-app.vercel.app` URL when it finishes.

---

## 7. Connect the deployed app back to Supabase

Once deployed, go back to Supabase: **Authentication → URL Configuration → Allowed Origins**, and add your Vercel domain (`https://your-app.vercel.app`). Without this, the deployed app's requests to Supabase may be blocked.

---

## 8. Running the app live in a classroom

- **Host device**: open `your-app.vercel.app` on the laptop/tablet running the game.
- **Projector/audience device**: open `your-app.vercel.app/audience` on a second screen — it syncs automatically in real time via Supabase Realtime, no manual refresh needed.
- Use **Camera** capture mode (webcam pointed at the workspace) — **Player Upload** (QR-code phone upload) mode is not fully built yet; see [docs/pending-tasks.md](docs/pending-tasks.md) for status before relying on it.

---

## 9. Optional: custom domain

If you'd rather present at a memorable URL than `*.vercel.app`, add a custom domain under the Vercel project's **Settings → Domains**, then repeat Step 7 with the new domain once it's live.

---

## Where to go next

| Need | Doc |
|---|---|
| Local dev setup (already covered above, but here's the plain version) | [SETUP.md](SETUP.md) |
| Full architecture, API routes, data model | [docs/system-architecture.md](docs/system-architecture.md) |
| Known bugs, unfinished features, priorities | [docs/pending-tasks.md](docs/pending-tasks.md) |
| Coding conventions if you plan to modify the app | [CLAUDE.md](CLAUDE.md) |
| One-command environment check | `npm run handoff` (or `/handoff` in Claude Code) |

Built for IST 130 · Penn State College of IST. No ongoing maintenance commitment from the original developer is implied — this handover is meant to make the new team fully self-sufficient.
