# Quick Build — Claude Instructions

## What This Is
A Next.js game show app for IST 130 (AI & Art). Players race a timer to build something (LEGO or drawing), upload photos mid-game, and an AI judge scores each build and picks a winner. There's a separate audience view meant for a projector screen.

## Commands
```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Run production build
```

## Environment
Requires `ANTHROPIC_API_KEY` in `.env.local`. The app will break at the judging/commentary steps without it.

## Architecture at a Glance
- `app/page.tsx` — root game state machine, manages phase transitions
- `app/components/` — one component per game phase (Setup, Playing, Judging, Results)
- `app/components/AudienceView.tsx` — projector screen, reads from localStorage
- `app/audience/page.tsx` — thin wrapper that renders AudienceView at `/audience`
- `app/api/commentary/route.ts` — live commentary during play (calls Claude with images)
- `app/api/judge/route.ts` — final judging after time expires (calls Claude with images)
- `app/types.ts` — all shared TypeScript types

## Code Conventions
- **No new dependencies** without discussing first. The project intentionally has a minimal dep tree.
- **Inline SVG icons only** — do not add lucide-react, heroicons, or any icon library. Icons are defined as small React components directly in each file.
- **Tailwind + CSS vars** — use Tailwind utility classes. Global design tokens live in `globals.css` as CSS custom properties (`--navy`, `--border`, etc.). Prefer CSS class names (`.card`, `.btn-primary`, `.btn-ghost`) over raw Tailwind for shared patterns.
- **No dark mode** — the app uses a white/navy theme. Do not reintroduce dark backgrounds.
- **Player colors** — always use the canonical array `['#1B3A6B', '#2563EB', '#0891B2', '#7C3AED']` for player color assignment, indexed by player position.

## State Flow
```
setup → playing → judging → results → (setup again)
```
State lives in `page.tsx`. The audience view is synced via `localStorage` key `quickbuild_audience` — `broadcastState()` writes to it, `AudienceView` polls it every 500ms.

## AI API Notes
- Both routes use `claude-opus-4-5` with multimodal (base64 image) inputs
- Commentary route returns `{ playerName, commentary }` JSON
- Judge route returns `{ scores, overallWinner, winnerAnnouncementScript }` JSON
- Both routes strip markdown code fences before parsing JSON (`cleaned = raw.replace(/```json...`)
- Players without a `photoBase64` are filtered out before being sent to either API

## What NOT to Change
- `app/types.ts` — changing these shapes breaks both API routes and all components
- The `localStorage` key name `quickbuild_audience` — audience view depends on it exactly
- The `capture="environment"` attribute on file inputs — needed for mobile camera
