# Handoff Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Quick Build repo handoff-ready — a `/handoff` slash command that verifies a new contributor's environment and surfaces known issues, plus corrected README/SETUP/CLAUDE.md docs that match the current (Vertex AI + Supabase) architecture instead of the stale (Claude API + localStorage) one.

**Architecture:** Docs restructure (README = pitch, SETUP.md = steps, CLAUDE.md = pointers to `docs/system-architecture.md` and `docs/pending-tasks.md`) plus one new markdown-based Claude Code slash command at `.claude/commands/handoff.md` that runs environment checks via Bash and reads the two docs files live. Small package.json/`.env.example` cleanup to remove a dead dependency.

**Tech Stack:** Next.js 14 repo (no test runner in this project — verification is manual: `npm run build`, running the slash command, checking rendered links). No new dependencies.

## Global Constraints

- No new dependencies (per `CLAUDE.md` code conventions) — this plan only removes one.
- Do not modify `app/types.ts`.
- Do not fix functional bugs found during the audit (e.g. missing `/play/[gameId]` pages) — those stay documented in `docs/pending-tasks.md` as known issues, out of scope for this plan.
- `docs/system-architecture.md` and `docs/pending-tasks.md` are already accurate — new/rewritten docs link to them rather than duplicating their content.
- Every internal doc link must resolve to a real path after all file moves in this plan.

---

### Task 1: Remove dead dependency and fix `.env.example`

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a `package.json` with no `@anthropic-ai/sdk` entry, and a `.env.example` listing only the three env vars actually read by the code (`VERTEX_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Later tasks (SETUP.md, CLAUDE.md) will reference these same three var names — keep them consistent.

- [ ] **Step 1: Remove `@anthropic-ai/sdk` from `package.json`**

In `package.json`, delete this line from `dependencies`:

```json
    "@anthropic-ai/sdk": "^0.78.0",
```

The resulting `dependencies` block:

```json
  "dependencies": {
    "@supabase/supabase-js": "^2.99.2",
    "@types/node": "^25.5.0",
    "@types/react": "^19.2.14",
    "next": "^14.2.35",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.9.3"
  },
```

- [ ] **Step 2: Reinstall to update the lockfile**

Run: `npm install`
Expected: completes without error; `package-lock.json` no longer references `@anthropic-ai/sdk`.

- [ ] **Step 3: Rewrite `.env.example` to drop the unused key**

Replace the full contents of `.env.example` with:

```
# Copy this file to .env.local and fill in your keys
# Never commit .env.local to git

VERTEX_API_KEY=your-key-here

NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

- [ ] **Step 4: Verify the build still passes**

Run: `npm run build`
Expected: `✓ Compiled successfully` and the route table prints as before (same routes as pre-change — `/`, `/audience`, `/camera/[gameId]/[playerId]`, `/api/commentary`, `/api/game`, `/api/judge`, `/api/tts`).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: remove unused @anthropic-ai/sdk dependency and stale env var

The app calls Vertex AI directly via fetch, not the Anthropic SDK — it was never imported anywhere. .env.example listed ANTHROPIC_API_KEY which nothing reads."
```

---

### Task 2: Move `WEBRTC_PLAN.md` into `docs/`

**Files:**
- Move: `WEBRTC_PLAN.md` → `docs/WEBRTC_PLAN.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `docs/WEBRTC_PLAN.md` exists; root `WEBRTC_PLAN.md` no longer exists. Later tasks (README.md, CLAUDE.md rewrites) must not link to the old root path.

- [ ] **Step 1: Move the file with git so history is preserved**

```bash
git mv WEBRTC_PLAN.md docs/WEBRTC_PLAN.md
```

- [ ] **Step 2: Verify no remaining references to the old path**

Run (ripgrep or Grep tool): search the repo (excluding `node_modules`, `.git`, `.next`) for the literal string `WEBRTC_PLAN.md` outside of `docs/WEBRTC_PLAN.md` itself.
Expected: no matches, or only matches that will be fixed by later tasks (note them if found — they'll be verified again in Task 6's final link check).

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: move WEBRTC_PLAN.md into docs/ for consistency with other planning docs"
```

---

### Task 3: Rewrite `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: env var names from Task 1 (`VERTEX_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Produces: a corrected `CLAUDE.md` that later tasks (SETUP.md, README.md, handoff command) can safely link to. Must NOT re-describe the API routes or data model in detail — those live in `docs/system-architecture.md` only, per the spec's "pointer, not duplicate" rule.

- [ ] **Step 1: Replace the full contents of `CLAUDE.md`**

```markdown
# Quick Build — Claude Instructions

## What This Is
A Next.js game show app for IST 130 (AI & Art) at Penn State. Players race a timer to build something (LEGO or drawing). An AI judge scores each build and picks a winner, with live commentary during play. A separate audience view is meant for a projector screen.

## Commands
```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Run production build
```

New to this repo? Run the `/handoff` slash command to verify your environment is set up correctly and see current known issues.

## Environment
Requires `VERTEX_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. See [SETUP.md](SETUP.md) for how to get these values. The app calls Vertex AI (Gemini) directly via `fetch` — there is no Anthropic/Claude API dependency despite the "Claude Instructions" filename convention.

## Architecture
Full architecture, API routes, data model, and Supabase schema live in [docs/system-architecture.md](docs/system-architecture.md) — **update that file, not this one**, when architecture changes. This file only holds conventions and guardrails that apply regardless of architecture.

## Known Issues
Current known bugs and in-progress work are tracked in [docs/pending-tasks.md](docs/pending-tasks.md). Check it before starting new work — it may already describe what you're about to hit.

## Code Conventions
- **No new dependencies** without discussing first. The project intentionally has a minimal dep tree.
- **Inline SVG icons only** — do not add lucide-react, heroicons, or any icon library. Icons are defined as small React components directly in each file.
- **Tailwind + CSS vars** — use Tailwind utility classes. Global design tokens live in `globals.css` as CSS custom properties (`--navy`, `--border`, etc.). Prefer CSS class names (`.card`, `.btn-primary`, `.btn-ghost`) over raw Tailwind for shared patterns.
- **No dark mode** — the app uses a white/navy theme. Do not reintroduce dark backgrounds.
- **Player colors** — always use the canonical array `['#1B3A6B', '#2563EB', '#0891B2', '#7C3AED']` for player color assignment, indexed by player position.

## What NOT to Change
- `app/types.ts` — changing these shapes breaks the API routes and components that depend on them
- The `capture="environment"` attribute on file inputs — needed for mobile camera
```

- [ ] **Step 2: Verify the file has no stale claims**

Search the new `CLAUDE.md` content for the strings `localStorage`, `ANTHROPIC_API_KEY`, and `quickbuild_audience`.
Expected: zero matches — those all described the old architecture and must not appear.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md to match current architecture

Was describing an old version of the app (Claude API, localStorage sync, no DB). Now points to docs/system-architecture.md and docs/pending-tasks.md as sources of truth instead of duplicating them, so it can't silently drift out of sync again."
```

---

### Task 4: Write `SETUP.md`

**Files:**
- Create: `SETUP.md`

**Interfaces:**
- Consumes: env var names from Task 1; the `games`/`players` schema and storage bucket name (`player-photos`) documented in `docs/system-architecture.md` (read that file's "Supabase Schema" section before writing this task — do not invent column names).
- Produces: `SETUP.md` at repo root. Task 5 (README.md) and Task 6 (handoff command) link to this file at path `SETUP.md` (repo root, not under `docs/`).

- [ ] **Step 1: Read the current Supabase schema section to confirm exact table/column names**

Read `docs/system-architecture.md`, specifically the "Supabase Schema" section (`games` and `players` tables) and the "Capture Modes" section (storage bucket name `player-photos`, path pattern `player-photos/{gameId}/{playerId}.jpg`). Use these exact names in Step 2 — do not paraphrase them differently.

- [ ] **Step 2: Write `SETUP.md`**

```markdown
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

The app calls the Vertex AI REST API directly (Gemini 2.5 Flash) for commentary, judging, and text-to-speech. You'll need a `VERTEX_API_KEY` with access to the Vertex AI Generative Language API.

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
```

- [ ] **Step 3: Verify no invented schema details**

Re-read the `docs/system-architecture.md` "Supabase Schema" section and confirm `SETUP.md` doesn't state column names or table names that aren't there. Fix any mismatch.

- [ ] **Step 4: Commit**

```bash
git add SETUP.md
git commit -m "docs: add SETUP.md with full local setup and deploy steps

Previously this content was folded into README.md and was stale (missing Supabase setup entirely). Split out so README can stay a short pitch."
```

---

### Task 5: Rewrite `README.md`

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `SETUP.md` (Task 4), `docs/system-architecture.md`, `docs/pending-tasks.md` — links only, no content duplication.
- Produces: final `README.md`. No later task depends on this file's content, but Task 6's final link-check verifies its links resolve.

- [ ] **Step 1: Replace the full contents of `README.md`**

```markdown
# AI Quick Build 🏆

A Gemini-powered game show experience for IST 130: AI & Art at Penn State.

Players race the clock to build a LEGO sculpture or draw something. The app watches, commentates live, then judges all builds and dramatically reveals a winner.

Inspired by Google's "AI Quick Build Experience" demo — built for classroom + orientation use.

---

## How It Works

1. **Setup** — Host enters player names, picks a challenge prompt ("Lighthouse", "Robot", etc.), selects build type (LEGO or drawing), and sets the timer.
2. **Playing** — Players build while the app runs a countdown. Photos come in via webcam capture, phone streaming, or player upload depending on capture mode. The AI generates live commentary at intervals once photos are present.
3. **Judging** — When time's up, the AI scores all builds across 4 criteria: Color, Structure, Adherence to Brief, and Detail/Complexity.
4. **Results** — A word-by-word dramatic announcement (read aloud via TTS), score bars per player, and a confetti winner reveal.
5. **Audience Mode** — Open `/audience` on a projector. It syncs with the host's game view in real time via Supabase Realtime.

---

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Vertex AI** (Gemini 2.5 Flash) for commentary, judging, and text-to-speech
- **Supabase** (Postgres + Realtime + Storage) for game state and photo sync
- Hosted on **Vercel**

---

## Getting Started

See [SETUP.md](SETUP.md) for full local setup and deploy instructions.

New to this repo? Run the `/handoff` slash command in Claude Code to verify your environment and see current known issues.

---

## Learn More

- [docs/system-architecture.md](docs/system-architecture.md) — full architecture, API routes, Supabase schema
- [docs/pending-tasks.md](docs/pending-tasks.md) — known issues and in-progress work
- [CLAUDE.md](CLAUDE.md) — conventions and guardrails for working in this codebase

---

## Customizing Challenge Prompts

Edit the `CHALLENGE_PRESETS` object in `app/components/SetupScreen.tsx`:

```ts
const CHALLENGE_PRESETS = {
  lego: ['Lighthouse', 'Rocket Ship', ...],
  drawing: ['Self-portrait', 'Alien landscape', ...],
}
```

You can also enter a custom challenge in the UI without touching code.

---

## Scoring Criteria

The AI evaluates each build on:

| Criterion | Description |
|-----------|-------------|
| **Color** | Creative and intentional use of color |
| **Structure** | Stability and overall form |
| **Adherence** | How closely it matches the challenge |
| **Detail** | Level of complexity and finishing touches |

Each is scored 1–10. The overall score is a composite judgment, not a simple average.

---

Built for IST 130 · Penn State College of IST
```

- [ ] **Step 2: Verify no stale claims remain**

Search the new `README.md` for the strings `Claude`, `ANTHROPIC`, `no database`, and `localStorage`.
Expected: zero matches.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README to match current architecture and link out to SETUP.md

Was describing Claude API + no-database + localStorage sync, none of which is true anymore. Setup steps moved to SETUP.md; architecture/known-issues linked instead of duplicated."
```

---

### Task 6: Create the `/handoff` slash command

**Files:**
- Create: `.claude/commands/handoff.md`

**Interfaces:**
- Consumes: `.env.local` / `.env.example` (Task 1), `docs/pending-tasks.md`, `docs/system-architecture.md`, `SETUP.md` (Task 4).
- Produces: a working `/handoff` slash command. Nothing downstream depends on this file's internals, but it's the primary deliverable of this plan.

- [ ] **Step 1: Write `.claude/commands/handoff.md`**

```markdown
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
```

- [ ] **Step 2: Verify the command runs and reports sensibly with `.env.local` present**

In Claude Code, run `/handoff`. Confirm it reports: node/npm versions, all three env vars present and non-placeholder (since `.env.local` already exists in this repo with real values), a passing build, the architecture summary, and the current `docs/pending-tasks.md` high-priority items (should include the `/play/` upload-mode gap).

- [ ] **Step 3: Verify the command handles a missing `.env.local` sensibly**

Temporarily rename `.env.local`:

```bash
mv .env.local .env.local.bak
```

Run `/handoff` again. Confirm it reports the missing file and tells the user to `cp .env.example .env.local`, and does **not** attempt to run `npm run build` or claim env vars are fine.

Restore the file:

```bash
mv .env.local.bak .env.local
```

- [ ] **Step 4: Final link check across all touched docs**

Search `README.md`, `SETUP.md`, `CLAUDE.md`, and `.claude/commands/handoff.md` for markdown links (`](...)`) pointing at repo-relative paths, and confirm each target file actually exists at that path (accounting for the `WEBRTC_PLAN.md` move in Task 2 and relative-path differences between root-level files and `.claude/commands/handoff.md`).

Expected: every link resolves. Fix any that don't.

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/handoff.md
git commit -m "feat: add /handoff slash command for new-contributor onboarding

Checks toolchain versions, verifies .env.local has real (non-placeholder) values for the three required env vars, runs npm install + build, and surfaces docs/pending-tasks.md's high-priority known issues — all live-read so it can't drift out of sync with the docs it points to."
```

---

### Task 7: Final end-to-end verification

**Files:** none created or modified — verification only.

**Interfaces:**
- Consumes: everything from Tasks 1-6.
- Produces: confirmation the whole handoff package works together for a fresh clone.

- [ ] **Step 1: Confirm the build is clean from a fully clean state**

```bash
rm -rf node_modules .next
npm install
npm run build
```

Expected: `✓ Compiled successfully`, same route table as Task 1 Step 4.

- [ ] **Step 2: Run `/handoff` one more time end-to-end**

Confirm it passes all checks (env present, build passes, known issues listed) in this fully-clean state.

- [ ] **Step 3: Read through README.md → SETUP.md → CLAUDE.md in order as a new contributor would**

Confirm the narrative is coherent: README explains what the app is and points onward, SETUP.md has no gaps a first-timer would trip on (Supabase bucket creation, Realtime enablement, env vars), CLAUDE.md correctly states the two docs it points to instead of re-explaining architecture.

- [ ] **Step 4: Commit any final fixes found in Steps 1-3**

If Steps 1-3 surfaced any issues, fix them and commit:

```bash
git add -A
git commit -m "docs: fix issues found in handoff package end-to-end verification"
```

If no issues were found, skip this step — nothing to commit.
