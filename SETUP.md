# Setup Guide

Full local setup and deploy steps for Quick Build. For what the app does and its tech stack, see [README.md](README.md). For architecture details, see [docs/system-architecture.md](docs/system-architecture.md).

## 1. Clone and install

```bash
git clone <your-repo-url>
cd quick-build
npm install
```

## 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, create the `games` and `players` tables per the schema in [docs/system-architecture.md](docs/system-architecture.md#supabase-schema).
3. Create a Storage bucket named `player-photos` (used for camera-mode frame uploads and player photo uploads — path pattern `player-photos/{gameId}/{playerId}.jpg`).
4. Under Project Settings → API, copy your Project URL and `anon` public key — you'll need these in step 4.
5. Enable Realtime on the `games` and `players` tables (Database → Replication) — the audience view and host screen both rely on Realtime subscriptions.

## 3. Get a Vertex AI key

The app calls the Vertex AI REST API directly (Gemini 2.5 Flash) for commentary, judging, and text-to-speech. You'll need a `VERTEX_API_KEY` with access to Vertex AI (`aiplatform.googleapis.com`) — not the separate Google AI Studio / Gemini API product.

## 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:
- `VERTEX_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the host view, and `/audience` in a second tab for the projector view.

New to the repo? Run the `/handoff` slash command (in Claude Code) to verify all of the above is wired up correctly and see current known issues before you start.

## 6. Deploy to Vercel

1. Push to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
3. Under **Environment Variables**, add `VERTEX_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy — Vercel auto-detects Next.js.
5. In Supabase, add your Vercel domain to **Authentication → URL Configuration → Allowed Origins** so the deployed app can reach Supabase.
