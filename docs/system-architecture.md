# System Architecture

## Overview
Quick Build is a Next.js 14 (App Router) application. It runs on a single host device (laptop/tablet) while displaying a projector view at `/audience`. State is synced between host and audience via **Supabase** — both Realtime subscriptions (for live updates) and direct table reads.

## Tech Stack
| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + custom CSS vars |
| AI | Vertex AI REST API (Gemini 2.5 Flash) |
| Database | Supabase (Postgres + Realtime + Storage) |
| Fonts | Google Fonts (Syne, Inter) |
| State | React `useState` (no external store) |

## File Structure
```
app/
├── page.tsx                  # Root — game state machine
├── layout.tsx                # HTML shell, font imports
├── globals.css               # CSS tokens, shared utility classes
├── types.ts                  # All shared TypeScript interfaces (frozen — do not edit)
├── types-extended.ts         # Extended types (CaptureMode, CameraLayout, GameConfigExtended)
├── audience/
│   └── page.tsx              # Thin wrapper → renders AudienceView at /audience
├── components/
│   ├── SetupScreen.tsx       # Phase: configure game before start
│   ├── PlayingScreen.tsx     # Phase: active countdown + photo uploads + camera capture
│   ├── JudgingScreen.tsx     # Phase: AI judging in progress (loading state)
│   ├── ResultsScreen.tsx     # Phase: scores, winner reveal, confetti
│   └── AudienceView.tsx      # Projector screen — subscribes to Supabase Realtime
└── api/
    ├── game/route.ts         # POST — create game + player rows; PATCH — update game
    ├── commentary/route.ts   # POST — live commentary (called every ~18s)
    └── judge/route.ts        # POST — final scoring after time expires
lib/
└── supabase.ts               # Supabase client (uses NEXT_PUBLIC_ env vars)
```

## Game Phase State Machine
Managed in `app/page.tsx` with a `GamePhase` string enum:

```
'setup' ──onStart()──► 'playing' ──onTimeUp()──► 'judging' ──onComplete()──► 'results'
   ▲                                                                               │
   └───────────────────────────────onPlayAgain()─────────────────────────────────┘
```

Each phase renders a different component. Phase-level data (`config`, `finalPlayers`, `judgingResult`) is lifted into `page.tsx` and passed down as props.

## Audience Sync (Supabase Realtime)
The audience view at `/audience` is designed to run in a second browser window (or second device on the same network if the app is deployed). It subscribes to Supabase Realtime channels:

- `audience-game-{id}` — watches `games` table for phase, commentary, and judging result updates
- `audience-players-{id}` — watches `players` table for photo uploads

On mount, `AudienceView` reads `quickbuild_game_id` from `localStorage` to find the current game, then subscribes. The host writes this key when a game starts. If no game ID is found yet, AudienceView polls localStorage every 1s until the host starts a game.

> Note: localStorage sync only works when host and projector are the **same browser on the same device**. For cross-device use the app must be deployed to a public URL (e.g. Vercel) so both devices hit the same Supabase instance.

## Capture Modes

The app supports two photo capture modes, selectable at setup:

### Mode 1: Camera (default, Google-style)
A webcam is pointed at the workspace. The host browser captures frames from a `<video>` element via canvas at a regular interval and sends them to `/api/commentary`. No player interaction required — the AI watches the feed continuously.

Two camera layout sub-options (chosen in the Capture Mode card at setup):
- **Shared camera** — one webcam, all players share the same feed. One `MediaStream` is opened; each PlayerCard mirrors the same `srcObject`. Frame captures are identical for all players (the AI sees the same image but comments on each player's progress based on prior context).
- **One per player** — separate webcam per desk. User assigns each player slot to a detected device via dropdown. One `MediaStream` per player, captured independently.

In both layouts:
- Frame capture happens client-side via a hidden `<canvas>`; base64 JPEG is POSTed to the API routes unchanged
- After each commentary interval, captured frames are upserted to Supabase Storage (`player-photos/{gameId}/{playerId}.jpg`) and `players.photo_path` is updated — this triggers AudienceView's Realtime subscription so the projector shows live frames
- Timer expiry triggers a final frame capture → `/api/judge`

### Mode 2: Player Upload
Players scan a QR code shown on the host screen, navigate to `/play/{gameId}` on their phones, tap their name, and upload a photo from their camera roll or live camera.

- Requires the `/play/[gameId]/` and `/play/[gameId]/[playerId]/` pages (not yet built)
- Photo is stored in Supabase Storage (`player-photos` bucket); host screen and audience view update via Realtime

## Supabase Schema

### `games` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | 6-char generated game code |
| `challenge` | text | The build prompt |
| `build_type` | text | `'lego'` or `'drawing'` |
| `timer_seconds` | int | 60 / 90 / 120 |
| `phase` | text | `'waiting'` → `'playing'` → `'judging'` → `'results'` |
| `started_at` | timestamptz | Set when host clicks Start |
| `commentary` | jsonb | Array of `{ id, playerName, text }` — appended by host |
| `judging_result` | jsonb | Full judging result written after judge call |

### `players` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID generated client-side |
| `game_id` | text (FK) | References `games.id` |
| `name` | text | Player display name |
| `player_number` | int | 1-indexed position |
| `photo_path` | text | Supabase Storage path (upload mode only) |

## API Routes

### POST /api/game
Creates a new game and player rows in Supabase. Returns `{ gameId }`.

**Input:**
```ts
{ challenge: string, buildType: BuildType, timerSeconds: number, players: { id, name, playerNumber }[] }
```

### PATCH /api/game
Updates arbitrary fields on a game row. Used for phase transitions and ad-hoc updates.

---

### POST /api/commentary
Called every 18 seconds during gameplay if at least one player has a photo. Also called on each camera frame capture interval in camera mode.

**Input:**
```ts
{ players: Player[], challenge: string, buildType: BuildType, previousComments: string[] }
```
- Only players with `photoBase64` are sent
- `previousComments` prevents the AI repeating the same angles

**Output:**
```ts
{ success: true, playerName: string, commentary: string }
```

**Model:** Gemini 2.5 Flash via Vertex AI — multimodal, max 1024 tokens

**JSON parsing:** response is extracted with `/\{[\s\S]*\}/` regex before `JSON.parse` to handle markdown fences or extra prose the model may prepend.

---

### POST /api/judge
Called once when time expires (after a 1.5s delay for drama).

**Input:**
```ts
{ players: Player[], challenge: string, buildType: BuildType }
```
- Only players with `photoBase64` are evaluated

**Output:**
```ts
{
  success: true,
  result: {
    scores: Record<string, PlayerScore>,
    overallWinner: { playerName, playerNumber, winnerReasoning },
    winnerAnnouncementScript: string
  }
}
```

**Model:** Gemini 2.5 Flash via Vertex AI — multimodal, max 1500 tokens

## Data Types

### app/types.ts (frozen — do not modify)
```ts
Player           { id, name, photoDataUrl, photoBase64 }
CommentaryEntry  { id, playerName, text, timestamp }
PlayerScore      { playerName, playerNumber, score, colorScore, structureScore, adherenceScore, detailScore, scoringReasoning }
JudgingResult    { scores, overallWinner, winnerAnnouncementScript }
GameConfig       { players, buildType, challenge, timerSeconds }
GamePhase        'setup' | 'playing' | 'judging' | 'results'
BuildType        'lego' | 'drawing'
```

### app/types-extended.ts (extends types.ts without modifying it)
```ts
CaptureMode           'upload' | 'camera'
CameraLayout          'shared' | 'per-player'
PlayerCameraAssignment { playerId: string, deviceId: string }
GameConfigExtended    extends GameConfig, adds: captureMode, cameraLayout, cameraAssignments[]
```

## Environment Variables
| Variable | Required | Notes |
|----------|----------|-------|
| `VERTEX_API_KEY` | Yes | Vertex AI API key — server-side only |
| `VERTEX_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
