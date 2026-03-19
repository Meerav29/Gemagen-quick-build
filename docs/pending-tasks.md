# Pending Tasks

## High Priority

### Testing After Theme Redesign
The entire frontend was redesigned (dark → white/navy) in one pass. It needs a full run-through:
- [ ] Setup screen — all form states (build type toggle, preset selection, custom input, player count, start button enable/disable)
- [ ] Playing screen — timer countdown, photo upload via click and drag-drop, commentary fetch trigger, commentary sidebar
- [ ] Judging screen — spinner animation, status line cycling, player thumbnail display
- [ ] Results screen — typewriter announcement, score bars animation, winner bounce-in, confetti, play again
- [ ] Audience view at `/audience` — all 4 phases (waiting, playing, judging, results)

### Mobile Responsiveness
The playing screen has a complex layout (timer in top bar + player grid + commentary sidebar). Test on:
- [ ] Small phone (375px) — timer ring may overflow or collide with challenge text
- [ ] Tablet (768px) — sidebar should stack below player grid (current `lg:flex-row` breakpoint)
- [ ] The top bar at `px-6 py-3` may be too cramped with the SVG timer on small screens — consider reducing timer ring size on mobile (currently 112×112, could drop to 80×80)

---

## Medium Priority

### Audience View Cross-Device Sync
Currently uses `localStorage`, which only works when host and projector are **the same browser on the same machine**. For actual classroom use across devices, this needs a real-time sync mechanism:
- Options: Server-Sent Events (SSE), a simple polling API endpoint, or a WebSocket route
- Quickest path: add a `/api/audience-state` GET route that reads from server-side memory, and a POST to update it — AudienceView polls the GET endpoint instead of localStorage

### Error Handling on API Routes
Both `/api/commentary` and `/api/judge` can fail silently or with a generic error. Improvements:
- [ ] Distinguish between "no API key" vs "API call failed" vs "JSON parse failed"
- [ ] Surface a user-friendly error in JudgingScreen if judging fails partway through (currently shows generic message)
- [ ] Rate limit / retry logic if commentary fetch fails (currently just logs to console)

### Players Without Photos in Judging
If a player never uploads a photo, they are silently excluded from judging (`activePlayers = players.filter(p => p.photoBase64)`). This is undisclosed to the user. Options:
- [ ] Show a warning in JudgingScreen listing which players are excluded
- [ ] Or allow judging to proceed on description alone for photoless players

---

## Low Priority / Future Improvements

### Challenge Preset Expansion
Current presets are hardcoded arrays in `SetupScreen.tsx`. Could be:
- [ ] Moved to a shared constants file
- [ ] Extended with more categories (origami, clay, etc.)
- [ ] Randomized with a "Surprise me" button

### Score Display — Audience Results View
The audience results view shows medal emojis (🥇🥈🥉) for rank. These are the only remaining emojis in the UI post-redesign. If full emoji removal is desired, replace with SVG medal/podium icons.

### Typewriter Speed
The winner announcement typewriter in `ResultsScreen` uses a fixed 120ms per word. Long announcements can feel slow. Consider:
- [ ] Adaptive speed based on total word count
- [ ] A "skip" button to jump to scores immediately

### `ANTHROPIC_API_KEY` Dev Setup
There's no `.env.local.example` file. New developers have no indication of what env vars are needed.
- [ ] Add `.env.local.example` with `ANTHROPIC_API_KEY=your_key_here`
- [ ] Add a mention in `README.md`

### API Model Version
Both routes hardcode `claude-opus-4-5`. This should be easy to update but is currently scattered:
- [ ] Extract model name to a shared constant (e.g., in a `lib/ai.ts` file)

### Accessibility
- [ ] All interactive elements need visible focus outlines (currently only inputs have focus rings)
- [ ] SVG icons used as meaningful content should have `aria-label` or be accompanied by text
- [ ] Timer countdown should have an `aria-live` region for screen readers

---

## Won't Fix / Out of Scope
- Persistent game history / leaderboard (would require a database)
- Player authentication
- Real-time multi-device gameplay beyond the audience projector sync
