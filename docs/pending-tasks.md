# Pending Tasks

## Current Priority: Camera Mode

### Camera Capture (Mode 1 — Google-style)
- [x] Add capture mode toggle to SetupScreen: "Camera" vs "Player Upload"
- [x] Add camera source selector per player slot (device dropdown, duplicate validation)
- [x] In PlayingScreen (camera mode): render a `<video>` element per player showing live feed
- [x] Capture frames from video via canvas on commentary interval, convert to base64 JPEG
- [x] On timer expiry, capture final frames and pass to `/api/judge`
- [x] Multi-camera support: one camera per player, each mapped to a Player slot
- [x] Camera permission / error handling (denied, in-use, disconnected mid-game)
- [ ] AudienceView: show last captured frame per player during playing phase (currently shows "building…" placeholder in camera mode — frames are never written to Supabase Storage)

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
- [ ] Small phone (375px) — timer ring may overflow or collide with challenge text in top bar
- [ ] Tablet (768px) — sidebar should stack below player grid (`lg:flex-row` breakpoint)
- [ ] Consider reducing timer ring on mobile (currently 112×112, could drop to 80×80)

---

## Medium Priority

### Audience View — Camera Frame Sync
In camera mode, player `photo_path` in Supabase is never set, so AudienceView shows "building…" for all players throughout the game. Options:
- [ ] After each commentary interval frame capture, upload the JPEG to Supabase Storage and update `players.photo_path` — AudienceView Realtime subscription picks it up automatically
- [ ] Or: push frames to a separate Supabase column (e.g. `last_frame_base64` on the players table) — avoids Storage costs but pollutes the DB with large payloads

### Error Handling on API Routes
- [ ] Distinguish between "no API key" vs "API call failed" vs "JSON parse failed"
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

### Env Var Documentation
- [ ] Update `.env.example` to reflect actual vars: `VERTEX_API_KEY`, `VERTEX_MODEL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add `README.md` with setup instructions

### Accessibility
- [ ] Visible focus outlines on all interactive elements
- [ ] `aria-label` on meaningful SVG icons
- [ ] `aria-live` region for timer countdown

---

## Won't Fix / Out of Scope
- Persistent game history / leaderboard
- Player authentication
- localStorage-based audience sync (replaced by Supabase Realtime)
