---
description: Verify your local environment is set up correctly and see current known issues before starting work on Quick Build.
---

Run through this checklist and report the results clearly, in order. Don't skip a step because an earlier one failed — report every step's status, then summarize.

## 1. Toolchain

Run `node -v` and `npm -v`. Just report the versions — there's no strict minimum, this is for visibility if something goes wrong later.

## 2. Environment file

Check whether `.env.local` exists at the repo root.

- If it does **not** exist: tell the user to run `cp .env.example .env.local` and fill in the three keys described below, then stop here (skip step 3) — there's no point running the build check without env vars.
- If it exists: read it and confirm these three variables are present and **not** equal to their `.env.example` placeholder values (`your-key-here`, `your-supabase-project-url`, `your-supabase-anon-key`):
  - `VERTEX_API_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

  Report each as present/missing/placeholder. Do not print the actual values (they're secrets). Do not make any network calls to validate them — presence and non-placeholder is enough for this check.

## 3. Install and build

Run `npm install` (safe to run even if already installed), then `npm run build`.

Report pass/fail. If it fails, show the actual build output (don't summarize away the error) — that's the most useful thing for a new contributor to see immediately.

## 4. Architecture summary

Print a short summary (5-10 lines) covering: Next.js 14 App Router app, Vertex AI (Gemini 2.5 Flash) for commentary/judging/TTS, Supabase (Postgres + Realtime + Storage) for game state and photo sync, and the game phase state machine (setup → playing → judging → results). Then point to `docs/system-architecture.md` for full detail — don't try to reproduce the whole doc here.

## 5. Known issues

Read `docs/pending-tasks.md` and surface:
- Everything under its "High Priority" heading
- Any unchecked (`- [ ]`) item under its "Deployment" heading

Present these as a short bulleted list so they're impossible to miss on day one — especially anything about the player-upload QR flow being incomplete, and the credential-rotation item if it's still unchecked.

## 6. Next steps

Close with a short checklist:
- If `.env.local` was missing or had placeholders: fill it in, then re-run `/handoff`.
- Read [SETUP.md](../../SETUP.md) for full local setup and deploy steps if you haven't already.
- Read `docs/pending-tasks.md` in full before starting new work — it may already describe what you're about to build or hit.
