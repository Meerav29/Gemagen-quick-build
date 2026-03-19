# AI Quick Build 🏆

A Claude-powered game show experience for IST 130: AI & Art at Penn State.

Players race the clock to build a LEGO sculpture or draw something. Claude watches, commentates live, then judges all builds and dramatically reveals a winner.

Inspired by Google's "AI Quick Build Experience" demo — rebuilt with Claude and designed for classroom + orientation use.

---

## How It Works

1. **Setup** — Host enters player names, picks a challenge prompt ("Lighthouse", "Robot", etc.), selects build type (LEGO or drawing), and sets the timer (60–120s).
2. **Playing** — Players build while the app runs a countdown. Anyone can upload a photo of their build (camera or file). Claude generates live commentary every ~18 seconds once photos are present.
3. **Judging** — When time's up, Claude scores all builds across 4 criteria: Color, Structure, Adherence to Brief, and Detail/Complexity.
4. **Results** — A word-by-word dramatic announcement, score bars per player, and a confetti winner reveal.
5. **Audience Mode** — Open `/audience` on a projector. It auto-syncs with the host's game view in real time (no server needed — uses localStorage cross-tab sync).

---

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Claude claude-opus-4-5** via `@anthropic-ai/sdk`
- Hosted on **Vercel**

---

## Local Development

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd quick-build

# 2. Install dependencies
npm install

# 3. Add your Anthropic API key
cp .env.example .env.local
# Edit .env.local and add your key

# 4. Run locally
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Under **Environment Variables**, add:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
4. Click **Deploy**

That's it. Vercel auto-detects Next.js.

---

## Audience / Projector Mode

Open `your-app.vercel.app/audience` on a projector or second screen.

The host runs the game on their laptop/phone at `your-app.vercel.app`. The audience page syncs automatically via localStorage (works because both tabs share the same origin — no WebSocket or server needed for demos on the same machine, or use any screen-mirroring for larger venues).

For large orientation events, the recommended setup is:
- Host laptop → runs the game at `/`
- Projector laptop → shows `/audience`, screen-shared or HDMI from the host machine

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

Claude evaluates each build on:

| Criterion | Description |
|-----------|-------------|
| **Color** | Creative and intentional use of color |
| **Structure** | Stability and overall form |
| **Adherence** | How closely it matches the challenge |
| **Detail** | Level of complexity and finishing touches |

Each is scored 1–10. The overall score is a composite judgment, not a simple average.

---

## File Structure

```
app/
├── page.tsx                    # Game state machine
├── layout.tsx                  # Fonts, metadata
├── globals.css                 # Theme, animations
├── types.ts                    # Shared TypeScript types
├── api/
│   ├── commentary/route.ts     # Live commentary endpoint
│   └── judge/route.ts          # Final judging endpoint
└── components/
    ├── SetupScreen.tsx          # Game configuration
    ├── PlayingScreen.tsx        # Timer + photo uploads + commentary
    ├── JudgingScreen.tsx        # Dramatic loading
    ├── ResultsScreen.tsx        # Scores + winner reveal
    └── AudienceView.tsx         # Projector display (/audience)
```

---

## Notes for the Department

- The API key lives in Vercel environment variables — never in code.
- Costs are minimal: a typical 4-player game runs ~4–6 Claude API calls total.
- The app has no database, no user accounts, no persistent storage — stateless by design, easy to maintain.
- Challenge prompts, timer lengths, and player counts are all configurable from the UI without code changes.
- To rebrand for Penn State orientation: update the badge text in `SetupScreen.tsx` and `layout.tsx` metadata.

---

Built for IST 130 · Penn State College of IST
