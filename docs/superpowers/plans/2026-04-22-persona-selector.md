# Persona Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persona dropdown to the setup screen that controls the AI commentator and judge voice throughout the game.

**Architecture:** A shared `app/lib/personas.ts` file defines 6 persona objects, each with `id`, `label`, `commentaryPrompt`, and `judgePrompt` fields. `GameConfigExtended` gains a `personaId` field. The setup screen renders a dropdown from the persona list. Both `/api/commentary` and `/api/judge` routes accept a `personaId` in the request body and inject the matching prompt text.

**Tech Stack:** TypeScript, Next.js App Router API routes, React, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/lib/personas.ts` | **Create** | Single source of truth for all 6 persona definitions |
| `app/types-extended.ts` | **Modify** | Add `personaId: PersonaId` to `GameConfigExtended` |
| `app/components/SetupScreen.tsx` | **Modify** | Add persona dropdown UI + state |
| `app/api/commentary/route.ts` | **Modify** | Accept `personaId`, use persona's `commentaryPrompt` |
| `app/api/judge/route.ts` | **Modify** | Accept `personaId`, use persona's `judgePrompt` |
| `app/components/PlayingScreen.tsx` | **Modify** | Pass `config.personaId` to `/api/commentary` |
| `app/components/JudgingScreen.tsx` | **Modify** | Pass `config.personaId` to `/api/judge` |

---

## Task 1: Create the personas library

**Files:**
- Create: `app/lib/personas.ts`

- [ ] **Step 1: Create `app/lib/personas.ts`**

```ts
export type PersonaId =
  | 'hype-man'
  | 'sportscaster'
  | 'gordon-ramsay'
  | 'nature-documentary'
  | 'conspiracy-theorist'
  | 'aussie-adventure'

export interface Persona {
  id: PersonaId
  label: string
  commentaryPrompt: string
  judgePrompt: string
}

export const PERSONAS: Persona[] = [
  {
    id: 'hype-man',
    label: 'Hype Man',
    commentaryPrompt: `You are a hype man at a live game show event — NOT a formal announcer. Use short punchy sentences. Slang is fine. "Oh wow", "okay okay", "I'm not sure about that..." NEVER use formal language. Keep it conversational, like you're texting a friend while watching.`,
    judgePrompt: `You are a hype man announcing the winner of a live game show. Keep the energy HIGH. Short punchy sentences, conversational, never formal. Build tension fast and drop the winner with a bang.`,
  },
  {
    id: 'sportscaster',
    label: 'Sportscaster',
    commentaryPrompt: `You are an ESPN-style sportscaster calling live play-by-play of a high-stakes quick build contest. Treat every brick placed or pencil stroke like a championship moment. Use sports metaphors. Reference stats, momentum, clutch plays. "And HERE comes the finishing move—"`,
    judgePrompt: `You are an ESPN-style sportscaster delivering the final verdict after a championship quick build contest. Build the tension like the final seconds of a game 7. Use sports language. Make the winner reveal feel like a buzzer beater.`,
  },
  {
    id: 'gordon-ramsay',
    label: 'Gordon Ramsay',
    commentaryPrompt: `You are Gordon Ramsay judging a high-stakes quick build contest. You are brutally honest, dramatic, and occasionally devastating. "This is RAW." "What IS that?" But you also give genuine praise when something surprises you. Be theatrical. No holding back.`,
    judgePrompt: `You are Gordon Ramsay delivering your final verdict on a quick build contest. Be dramatic, brutally honest, and a little mean — but fair. Roast the losers gently, then announce the winner with maximum theatrical flair.`,
  },
  {
    id: 'nature-documentary',
    label: 'Nature Documentary',
    commentaryPrompt: `You are David Attenborough narrating a nature documentary about humans attempting to build things under time pressure. Treat every action like fascinating wildlife behaviour. Speak in hushed, reverent tones. "Here, we observe the builder reaching for a crucial piece... will instinct guide the hand?"`,
    judgePrompt: `You are David Attenborough delivering the closing narration of a nature documentary about a quick build contest. Reflect on what we have witnessed. Build slowly to the winner reveal as if narrating the survival of the fittest.`,
  },
  {
    id: 'conspiracy-theorist',
    label: 'Conspiracy Theorist',
    commentaryPrompt: `You are a conspiracy theorist who reads DEEPLY into every creative choice made by the builders. Nothing is accidental. Every colour choice has a hidden meaning. Every structural decision signals something. "Notice how they placed that piece EXACTLY where they'd want you to look away from..."`,
    judgePrompt: `You are a conspiracy theorist announcing the winner of a quick build contest. Nothing about the judging is straightforward. Connect the dots. Find the patterns. Eventually, reluctantly, reveal who "they" want to win — and who actually deserved it.`,
  },
  {
    id: 'aussie-adventure',
    label: 'Australian Adventure Man',
    commentaryPrompt: `You are a Crocodile Hunter-style Australian wildlife presenter, but instead of dangerous animals you're covering dangerous creative choices in a quick build contest. Everything is either "absolutely magnificent" or could "take your hand clean off". Pure enthusiasm, broad accent implied, zero chill.`,
    judgePrompt: `You are a Crocodile Hunter-style Australian presenter announcing the winner of a quick build contest. Treat the whole thing like you've just wrestled a croc and lived to tell the tale. Massive enthusiasm, high stakes energy, announce the winner like it's the most extraordinary thing you've ever seen in the wild.`,
  },
]

export const DEFAULT_PERSONA_ID: PersonaId = 'hype-man'

export function getPersona(id: PersonaId): Persona {
  return PERSONAS.find(p => p.id === id) ?? PERSONAS[0]
}
```

- [ ] **Step 2: Verify the file looks correct**

```bash
cat app/lib/personas.ts
```

Expected: 6 persona objects, all fields present.

- [ ] **Step 3: Commit**

```bash
git add app/lib/personas.ts
git commit -m "feat: add personas library with 6 commentator personas"
```

---

## Task 2: Add `personaId` to the type

**Files:**
- Modify: `app/types-extended.ts`

- [ ] **Step 1: Add the import and field to `GameConfigExtended`**

Open `app/types-extended.ts`. Replace the entire file with:

```ts
export * from './types'
import type { GameConfig } from './types'
import type { PersonaId } from './lib/personas'

export type { PersonaId }
export type CaptureMode = 'upload' | 'camera' | 'phone'
export type CameraLayout = 'shared' | 'per-player'

export interface PlayerCameraAssignment {
  playerId: string
  deviceId: string
}

export interface GameConfigExtended extends GameConfig {
  captureMode: CaptureMode
  cameraLayout: CameraLayout
  cameraAssignments: PlayerCameraAssignment[]
  personaId: PersonaId
}
```

- [ ] **Step 2: Run the TypeScript compiler to check for errors**

```bash
npx tsc --noEmit
```

Expected: No errors (or only pre-existing unrelated errors — none about `personaId`).

- [ ] **Step 3: Commit**

```bash
git add app/types-extended.ts
git commit -m "feat: add personaId to GameConfigExtended"
```

---

## Task 3: Add persona dropdown to SetupScreen

**Files:**
- Modify: `app/components/SetupScreen.tsx`

- [ ] **Step 1: Add the import at the top of `SetupScreen.tsx`**

Find the existing imports block (lines 1–5) and add:

```ts
import { PERSONAS, DEFAULT_PERSONA_ID, PersonaId } from '../lib/personas'
```

- [ ] **Step 2: Add persona state inside the `SetupScreen` component**

Find the line:
```ts
const [captureMode, setCaptureMode] = useState<CaptureMode>('upload')
```

Add directly above it:
```ts
const [personaId, setPersonaId] = useState<PersonaId>(DEFAULT_PERSONA_ID)
```

- [ ] **Step 3: Pass `personaId` in `handleStart`**

Find the `onStart({...})` call at the bottom of `handleStart`. Add `personaId` to the object:

```ts
onStart({
  players,
  buildType,
  challenge: selectedChallenge.trim(),
  timerSeconds,
  captureMode,
  cameraLayout: captureMode === 'camera' ? cameraLayout : 'shared',
  cameraAssignments: cameraAssignmentsList,
  personaId,
})
```

- [ ] **Step 4: Add the persona card to the JSX**

Find the Timer card (`{/* Timer */}`). Add this new card **after** the Timer card and **before** the Capture Mode card:

```tsx
{/* Commentator Persona */}
<div className="card p-5">
  <label className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
    <MicIcon /> Commentator Persona
  </label>
  <select
    value={personaId}
    onChange={e => setPersonaId(e.target.value as PersonaId)}
    className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#EEF3FB] transition-colors"
  >
    {PERSONAS.map(p => (
      <option key={p.id} value={p.id}>{p.label}</option>
    ))}
  </select>
</div>
```

Note: `MicIcon` is already defined in `PlayingScreen.tsx` but NOT in `SetupScreen.tsx`. Add this inline SVG component near the other icon components at the top of the file (after `UploadIcon`):

```tsx
function MicIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="7" y="2" width="6" height="9" rx="3" />
      <path d="M4 10a6 6 0 0012 0" strokeLinecap="round" />
      <line x1="10" y1="16" x2="10" y2="19" strokeLinecap="round" />
      <line x1="7" y1="19" x2="13" y2="19" strokeLinecap="round" />
    </svg>
  )
}
```

- [ ] **Step 5: Run the dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm:
- A "Commentator Persona" card appears between Timer and Capture Mode
- The dropdown shows all 6 personas
- Selecting one doesn't break anything

- [ ] **Step 6: Commit**

```bash
git add app/components/SetupScreen.tsx
git commit -m "feat: add persona selector dropdown to setup screen"
```

---

## Task 4: Wire persona into `/api/commentary`

**Files:**
- Modify: `app/api/commentary/route.ts`
- Modify: `app/components/PlayingScreen.tsx`

### Part A — Update the API route

- [ ] **Step 1: Add the import to `route.ts`**

At the top of `app/api/commentary/route.ts`, add:

```ts
import { getPersona, DEFAULT_PERSONA_ID } from '../../lib/personas'
```

- [ ] **Step 2: Read `personaId` from the request body**

Find:
```ts
const { players, challenge, buildType, previousComments } = await req.json()
```

Replace with:
```ts
const { players, challenge, buildType, previousComments, personaId } = await req.json()
```

- [ ] **Step 3: Replace the hardcoded persona string with the library lookup**

Find and delete these lines:
```ts
const buildDesc = buildType === 'lego' ? 'LEGO brick sculpture' : 'drawing'
const persona = buildType === 'lego'
  ? 'witty, enthusiastic game show commentator who loves LEGO'
  : 'playful art critic who takes drawings very seriously (maybe too seriously)'

const promptText = `You are a ${persona} at a high-stakes quick build contest — talk like a hype man at a live event, NOT a formal announcer. Use short punchy sentences. Slang is fine. "Oh wow", "okay okay", "I'm not sure about that..." NEVER use formal language. Keep it conversational, like you're texting a friend.

Players have ${buildType === 'lego' ? '90' : '60'} seconds to build a "${challenge}" as a ${buildDesc}.

They are judged on: Creative Use of Color, Structural Integrity, Adherence to the Brief, and Detail & Complexity.

Make ONE short, specific comment (2-3 sentences max) about ONE player's build progress.
- Call the player by name
- Reference something SPECIFIC and VISUAL you can see in their photo
- Keep it SHORT and PUNCHY — this will be read aloud to a live audience
- NO formal language, NO stiff phrases like "I observe" or "it appears" — just react naturally

Previous comments (avoid repeating these angles):
${previousComments.slice(-4).join('\n') || 'None yet'}

Here are the current builds:`
```

Replace with:
```ts
const buildDesc = buildType === 'lego' ? 'LEGO brick sculpture' : 'drawing'
const persona = getPersona(personaId ?? DEFAULT_PERSONA_ID)

const promptText = `${persona.commentaryPrompt}

Players have ${buildType === 'lego' ? '90' : '60'} seconds to build a "${challenge}" as a ${buildDesc}.

They are judged on: Creative Use of Color, Structural Integrity, Adherence to the Brief, and Detail & Complexity.

Make ONE short, specific comment (2-3 sentences max) about ONE player's build progress.
- Call the player by name
- Reference something SPECIFIC and VISUAL you can see in their photo
- Keep it SHORT and PUNCHY — this will be read aloud to a live audience
- NO formal language, NO stiff phrases like "I observe" or "it appears" — just react naturally

Previous comments (avoid repeating these angles):
${previousComments.slice(-4).join('\n') || 'None yet'}

Here are the current builds:`
```

### Part B — Pass `personaId` from PlayingScreen

- [ ] **Step 4: Find the commentary fetch in `PlayingScreen.tsx`**

Search for the fetch to `/api/commentary` (around line 547). It currently sends:
```ts
challenge: config.challenge,
buildType: config.buildType,
```

Add `personaId` to the body:
```ts
challenge: config.challenge,
buildType: config.buildType,
personaId: config.personaId,
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/commentary/route.ts app/components/PlayingScreen.tsx
git commit -m "feat: pass personaId to commentary route"
```

---

## Task 5: Wire persona into `/api/judge`

**Files:**
- Modify: `app/api/judge/route.ts`
- Modify: `app/components/JudgingScreen.tsx`

### Part A — Update the API route

- [ ] **Step 1: Add the import to `app/api/judge/route.ts`**

```ts
import { getPersona, DEFAULT_PERSONA_ID } from '../../lib/personas'
```

- [ ] **Step 2: Read `personaId` from the request body**

Find:
```ts
const { players, challenge, buildType } = await req.json()
```

Replace with:
```ts
const { players, challenge, buildType, personaId } = await req.json()
```

- [ ] **Step 3: Inject the persona's `judgePrompt` into the prompt**

Find:
```ts
const promptText = `You are the head judge of a high-stakes quick build contest.
Players had limited time to build "${challenge}" as a ${buildDesc}.
```

Replace with:
```ts
const persona = getPersona(personaId ?? DEFAULT_PERSONA_ID)

const promptText = `${persona.judgePrompt}

Players had limited time to build "${challenge}" as a ${buildDesc}.
```

Note: keep everything after this line unchanged (criteria, winner instructions, schema).

### Part B — Pass `personaId` from JudgingScreen

- [ ] **Step 4: Find the judge fetch in `JudgingScreen.tsx`**

Search for the fetch to `/api/judge` (around line 60). It currently sends:
```ts
challenge: config.challenge,
buildType: config.buildType,
```

Add `personaId`:
```ts
challenge: config.challenge,
buildType: config.buildType,
personaId: config.personaId,
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/judge/route.ts app/components/JudgingScreen.tsx
git commit -m "feat: pass personaId to judge route"
```

---

## Task 6: End-to-end smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Run a game with each of the 6 personas**

For each persona, verify:
1. Setup screen: dropdown shows the persona name
2. During game: commentary audio reflects the persona voice (if API keys present)
3. Judging: winner announcement script reads in the persona's style

Minimum acceptable test: run one full game with **Nature Documentary** and one with **Gordon Ramsay** — these have the most distinct voices and will immediately reveal if the persona is being ignored.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: persona selector — 6 commentator voices for commentary and judging"
```
