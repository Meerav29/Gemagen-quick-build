# Pending Tasks

## Current Priority: Camera Mode

### Camera Capture (Mode 1 — Google-style)
- [x] Add capture mode toggle to SetupScreen: "Camera" vs "Player Upload"
- [x] Add camera layout sub-toggle: "One shared camera" vs "One per player" (in Capture Mode card, not per-player in Players card)
- [x] In PlayingScreen (camera mode): render a `<video>` element per player showing live feed
- [x] Capture frames from video via canvas on commentary interval, convert to base64 JPEG
- [x] On timer expiry, capture final frames and pass to `/api/judge`
- [x] Multi-camera support: one camera per player, each mapped to a Player slot
- [x] Camera permission / error handling (denied, in-use, disconnected mid-game)
- [x] AudienceView: upsert captured frames to Supabase Storage + update `players.photo_path` after each commentary interval — Realtime subscription picks it up automatically, projector shows live frames

---

## High Priority

### Player Upload Mode (Mode 2 — phone QR scan)
The `/play/` route pages don't exist yet. The host screen shows a QR and links pointing to these URLs but they 404. Only needed if upload mode will be used:
- [ ] `app/play/[gameId]/page.tsx` — player lobby: shows player name list, each taps their name
- [ ] `app/play/[gameId]/[playerId]/page.tsx` — individual upload page: camera input → uploads to Supabase Storage → triggers Realtime update

### End-to-End Testing
The entire app needs a full run-through after the camera mode additions and theme redesign:
- [ ] Setup screen — capture mode toggle, camera enumeration, camera selects, duplicate validation, canStart guard
- [ ] Setup screen — upload mode: all original form states still work
- [ ] Playing screen (camera mode) — streams start, video renders, commentary fires at 18s intervals, timer expiry captures final frames
- [ ] Playing screen (upload mode) — join panel, QR code, Supabase Realtime photo updates, commentary
- [ ] Judging screen — spinner, status lines, player thumbnails
- [ ] Results screen — typewriter announcement, score bars, winner reveal, confetti, play again
- [ ] Audience view — all 4 phases (waiting, playing, judging, results)

### Mobile Responsiveness
- [x] Dual timer SVG: 80px on mobile, 112px on sm+ — prevents collision with challenge text
- [x] 3-player grid: 2-col on mobile, 3-col on sm+
- [x] SetupScreen: padding and heading sizes adjusted for small screens
- [ ] Tablet (768px) — sidebar stacks below player grid at `lg:` breakpoint (intended behavior, verify in prod)

---

## Medium Priority

### Error Handling on API Routes
- [x] Commentary route: extract JSON with `/\{[\s\S]*\}/` regex instead of blind `JSON.parse` — handles model prepending prose or markdown fences
- [x] Commentary `maxOutputTokens` raised from 256 → 1024 — fixes truncated JSON responses
- [x] Both routes log raw model response if no JSON object is found
- [ ] Distinguish "no API key" vs "API call failed" vs "JSON parse failed" for user-facing errors
- [ ] Surface a user-friendly error in JudgingScreen if judging fails partway through
- [ ] Retry logic if commentary fetch fails (currently just logs to console)

### Players Without Photos in Judging (upload mode)
If a player never uploads, they are silently excluded from judging:
- [ ] Show a warning in JudgingScreen listing which players are excluded

---

## Low Priority / Future Improvements

### Challenge Preset Expansion
- [ ] Randomized "Surprise me" button
- [ ] More categories (origami, clay, etc.)

### Score Display — Audience Results View
Medal emojis (🥇🥈🥉) are the only remaining emojis post-redesign. Replace with SVG if desired.

### Typewriter Speed
- [ ] Adaptive speed based on word count
- [ ] "Skip" button to jump to scores

### Deployment
- [ ] Rotate leaked credentials (`.env.example` was committed to git with real keys — regenerate Vertex API key + Supabase anon key)
- [ ] Strip real values from `.env.example`, replace with placeholders
- [ ] Push repo to GitHub, connect to Vercel, add env vars in Vercel dashboard
- [ ] Add Vercel domain to Supabase allowed origins (Authentication → URL Configuration)
- [ ] Add `README.md` with local setup and deploy instructions

### Accessibility
- [ ] Visible focus outlines on all interactive elements
- [ ] `aria-label` on meaningful SVG icons
- [ ] `aria-live` region for timer countdown

---

## Won't Fix / Out of Scope
- Persistent game history / leaderboard
- Player authentication
- localStorage-based audience sync (replaced by Supabase Realtime)
