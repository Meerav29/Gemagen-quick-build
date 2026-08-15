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

New to this repo? Run `npm run handoff` (or the `/handoff` slash command in Claude Code) to verify your environment and see current known issues.

**Taking ownership of this repo for your own team/department?** See [HANDOVER.md](HANDOVER.md) for the full fork → accounts → deploy walkthrough.

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
