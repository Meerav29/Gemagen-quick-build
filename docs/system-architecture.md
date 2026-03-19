# System Architecture

## Overview
Quick Build is a Next.js 14 (App Router) application. It runs on a single host device (laptop/tablet) while optionally displaying a projector view at `/audience`. Communication between the two views is done entirely via `localStorage` — no websockets, no server state.

## Tech Stack
| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + custom CSS vars |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| Fonts | Google Fonts (Syne, Inter) |
| State | React `useState` (no external store) |

## File Structure
```
app/
├── page.tsx                  # Root — game state machine
├── layout.tsx                # HTML shell, font imports
├── globals.css               # CSS tokens, shared utility classes
├── types.ts                  # All shared TypeScript interfaces
├── audience/
│   └── page.tsx              # Thin wrapper → renders AudienceView at /audience
├── components/
│   ├── SetupScreen.tsx       # Phase: configure game before start
│   ├── PlayingScreen.tsx     # Phase: active countdown + photo uploads
│   ├── JudgingScreen.tsx     # Phase: AI judging in progress (loading state)
│   ├── ResultsScreen.tsx     # Phase: scores, winner reveal, confetti
│   └── AudienceView.tsx      # Projector screen — polls localStorage
└── api/
    ├── commentary/route.ts   # POST — live commentary (called every ~18s)
    └── judge/route.ts        # POST — final scoring after time expires
```

## Game Phase State Machine
Managed in `app/page.tsx` with a `GamePhase` string enum:

```
'setup' ──onStart()──► 'playing' ──onTimeUp()──► 'judging' ──onComplete()──► 'results'
   ▲                                                                               │
   └───────────────────────────────onPlayAgain()─────────────────────────────────┘
```

Each phase renders a different component. Phase-level data (`config`, `finalPlayers`, `judgingResult`) is lifted into `page.tsx` and passed down as props.

## Audience Sync (localStorage)
The audience view at `/audience` is designed to run on a second device (projector). It polls every 500ms:

```ts
// page.tsx writes on every state change:
localStorage.setItem('quickbuild_audience', JSON.stringify({ phase, challenge, ... }))

// AudienceView.tsx reads every 500ms:
const raw = localStorage.getItem('quickbuild_audience')
setState(JSON.parse(raw))
```

Key: `quickbuild_audience`. Shape defined by `AudienceState` interface in `AudienceView.tsx`.

> Note: This only works if both views run in the same browser on the same device, or via a shared browser profile. For cross-device sync, this would need to be replaced with a websocket or polling API.

## API Routes

### POST /api/commentary
Called every 18 seconds during gameplay if at least one player has uploaded a photo.

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

**Model:** `claude-opus-4-5` — multimodal, max 256 tokens

---

### POST /api/judge
Called once when time expires, after a 1.5s delay for drama.

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
    scores: Record<string, PlayerScore>,   // keyed by "player_1", "player_2", etc.
    overallWinner: { playerName, playerNumber, winnerReasoning },
    winnerAnnouncementScript: string       // typewriter-revealed in ResultsScreen
  }
}
```

**Model:** `claude-opus-4-5` — multimodal, max 1500 tokens

## Data Types (app/types.ts)
```ts
Player           { id, name, photoDataUrl, photoBase64 }
CommentaryEntry  { id, playerName, text, timestamp }
PlayerScore      { playerName, playerNumber, score, colorScore, structureScore, adherenceScore, detailScore, scoringReasoning }
JudgingResult    { scores, overallWinner, winnerAnnouncementScript }
GameConfig       { players, buildType, challenge, timerSeconds }
GamePhase        'setup' | 'playing' | 'judging' | 'results'
BuildType        'lego' | 'drawing'
```

## Environment Variables
| Variable | Required | Notes |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | Yes | Used server-side only in API routes |
