# Handoff Package Design

## Problem

Quick Build is being handed off to a new team of students. The current onboarding docs (`README.md`, `CLAUDE.md`) describe an old version of the app — Claude API for judging/commentary, `localStorage` cross-tab sync, no database, 2 API routes, requiring `ANTHROPIC_API_KEY`. None of that matches the current codebase, which uses Vertex AI/Gemini, Supabase (Postgres + Realtime + Storage), 4 API routes, WebRTC phone streaming, and a persona system. A new team reading these docs first would be misled from minute one.

Separately, `docs/system-architecture.md` and `docs/pending-tasks.md` already exist and are accurate/current — they just aren't surfaced to someone who has only just cloned the repo.

## Goals

1. A `/handoff` slash command a new team can run immediately after cloning that verifies their environment is set up correctly and surfaces known issues.
2. Onboarding docs (README, new SETUP.md, CLAUDE.md) that reflect the real, current architecture and don't duplicate content that can drift out of sync again.
3. Minor cleanup: remove the dead `@anthropic-ai/sdk` dependency and the unused `ANTHROPIC_API_KEY` entry in `.env.example`.

## Non-goals

- Not fixing functional bugs found during the audit (e.g. the missing `/play/[gameId]` pages for QR upload mode). These stay documented in `docs/pending-tasks.md` as known issues for the new team to pick up.
- Not adding live network validation of API keys (Vertex/Supabase) — presence/non-placeholder checks only, to keep the command fast and quota-free.
- Not restructuring `docs/system-architecture.md` or `docs/pending-tasks.md` — they're already accurate; the new docs will link to them rather than re-describe their content.

## Design

### 1. `/handoff` slash command

New file: `.claude/commands/handoff.md`.

Runs, in order:
1. **Toolchain check** — `node -v`, `npm -v` printed for sanity (no hard version gate; just visibility).
2. **Env check** — read `.env.local` (or note it's missing and tell the user to `cp .env.example .env.local`). Confirm `VERTEX_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present and not equal to the placeholder values from `.env.example`. No network calls.
3. **Install + build check** — run `npm install` if `node_modules` is missing/stale, then `npm run build`. Report pass/fail plainly; on failure, surface the build output rather than swallowing it.
4. **Architecture summary** — print a short (5-10 line) plain-language summary of the app and link to `docs/system-architecture.md` for the full picture.
5. **Known issues** — read `docs/pending-tasks.md` live and surface the "High Priority" and any unchecked "Deployment" section items (e.g. the broken `/play/` upload flow, credential rotation status) so they're impossible to miss on day one.
6. **Next steps** — a short closing checklist: fill in `.env.local` if missing, read `SETUP.md` for full local/deploy steps, read `docs/pending-tasks.md` before starting new work.

The command is markdown instructions for Claude to execute (matching the existing `.claude/commands/` pattern in this repo, if any — otherwise following standard Claude Code slash-command conventions), not a compiled script. It shells out to `node`/`npm` via Bash and reads the docs files directly.

### 2. Documentation restructure

**README.md** (rewritten)
- What the app is and how a game works (keep existing "How It Works" narrative, it's accurate)
- Corrected tech stack: Next.js 14, TypeScript, Tailwind, **Vertex AI (Gemini 2.5 Flash)**, Supabase
- Short links: "Setting up locally? See [SETUP.md](../SETUP.md)." / "Architecture details: [docs/system-architecture.md](../docs/system-architecture.md)." / "Known issues: [docs/pending-tasks.md](../docs/pending-tasks.md)."
- Drop the "no database, no persistent storage" claim (false) and the Claude-branding language

**SETUP.md** (new)
- Clone → `npm install` → `cp .env.example .env.local` → fill in `VERTEX_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase setup: create project, run schema (games/players tables per `docs/system-architecture.md`), create the `player-photos` storage bucket
- `npm run dev`, verify at localhost:3000
- Deploy to Vercel: env vars, Supabase allowed-origins config
- Pointer to `/handoff` as the sanity-check command for new contributors

**CLAUDE.md** (rewritten, kept short)
- What the app is (1-2 sentences)
- Commands (unchanged, still correct)
- Environment: corrected to `VERTEX_API_KEY` + Supabase vars, not `ANTHROPIC_API_KEY`
- Architecture: **pointer only** — "See docs/system-architecture.md for the full architecture, API routes, and data model. Do not duplicate that content here — update the doc, not this file, when architecture changes."
- Known issues: pointer to `docs/pending-tasks.md`
- Code conventions section (dependencies, icons, Tailwind, no dark mode, player colors) — kept as-is, still accurate and this is genuinely useful inline guidance
- "What NOT to change" section corrected: remove the stale `quickbuild_audience` localStorage claim (no longer true — audience sync is Supabase Realtime now), keep `app/types.ts` frozen guidance, keep `capture="environment"` note

### 3. Cleanup

- Remove `@anthropic-ai/sdk` from `package.json` dependencies (confirmed unused via grep across `app/`)
- Remove `ANTHROPIC_API_KEY` line from `.env.example` (unused; only `VERTEX_API_KEY` + two Supabase vars are read anywhere in the code)
- Move `WEBRTC_PLAN.md` from repo root into `docs/` for consistency with the rest of the planning docs

## Testing / Verification

- `npm run build` must still pass after the `package.json` change (removing an unused dep shouldn't break anything, but verify)
- Manually run through the new `/handoff` command once implemented to confirm each check reports sensibly on both a clean clone (missing `.env.local`) and a fully configured machine
- Confirm all internal doc links (README → SETUP.md, README/CLAUDE.md → docs/*.md) resolve to real paths after the `WEBRTC_PLAN.md` move
