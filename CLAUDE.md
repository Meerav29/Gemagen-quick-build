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
