# Design Directions

## Philosophy
Clean, minimal, professional. The UI should feel like a well-made product — not an AI-generated prototype. White backgrounds, precise spacing, and restrained use of color. The navy accent acts as the single strong color; everything else is neutral.

**Anti-patterns to avoid:**
- Dark backgrounds with glowing neon accents
- All-caps text everywhere
- Heavy drop shadows or glow effects
- Decorative noise textures or scanline overlays
- Emoji as UI icons
- Excessive animation or particle effects

---

## Color Tokens (CSS custom properties in globals.css)

| Token | Hex | Usage |
|-------|-----|-------|
| `--navy` | `#1B3A6B` | Primary brand color, active states, headings |
| `--navy-dark` | `#0F2549` | Hover state for navy buttons |
| `--navy-mid` | `#2D5BA3` | Mid-range navy, rarely needed |
| `--navy-light` | `#EEF3FB` | Hover backgrounds, focus rings, tinted areas |
| `--bg` | `#F8FAFC` | Page background (slightly off-white) |
| `--surface` | `#FFFFFF` | Card backgrounds |
| `--surface-2` | `#F1F5F9` | Raised card interiors, subtle insets |
| `--border` | `#E2E8F0` | All borders and dividers |
| `--text` | `#0F172A` | Primary body text |
| `--text-muted` | `#64748B` | Secondary/helper text |
| `--green` | `#16A34A` | Timer (healthy), success states |
| `--amber` | `#D97706` | Timer (warning, <30s) |
| `--red` | `#DC2626` | Timer (urgent, <15s), error states |

Also used in Tailwind inline values:
- `#94A3B8` — very muted labels, metadata text
- `#475569` — commentary body text, slightly stronger than muted
- `#C7D9F0` — light navy border for winner/active cards

---

## Player Colors
Always assigned by player index using this canonical array:
```ts
const PLAYER_COLORS = ['#1B3A6B', '#2563EB', '#0891B2', '#7C3AED']
```
These are navy → blue → teal → violet. They read well on white and feel cohesive. Do not replace with bright/saturated colors.

---

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / brand | Syne | 700–800 | "Quick Build" logo, phase headings, scores, player names |
| Body | Inter | 400–600 | All other text — labels, descriptions, commentary, buttons |

Loaded from Google Fonts. Registered in CSS as:
```css
--font-display: 'Syne', sans-serif;
--font-body: 'Inter', sans-serif;
```

**Conventions:**
- Section labels: `text-xs font-semibold text-[#94A3B8] uppercase tracking-wider`
- Page headings: `font-display font-bold text-[#0F172A]` (not all-caps, not letter-spaced)
- Brand name: `font-display font-bold` — "Quick" in `text-[#0F172A]`, "Build" in `text-[#1B3A6B]`

---

## Component Patterns

### Cards
Use the `.card` CSS class for all white containers:
```css
background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05)
```
Use `.card-raised` for secondary inset content (commentary items, score rows):
```css
background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 10px
```

### Buttons
Use `.btn-primary` for the main CTA (navy fill, white text):
```css
background: #1B3A6B; color: white; border-radius: 8px; font-weight: 600
```
Use `.btn-ghost` for secondary/option buttons (white fill, slate border):
```css
background: white; border: 1.5px solid #E2E8F0; color: #64748B; border-radius: 8px
```
Active/selected state for ghost buttons: `bg-[#1B3A6B] text-white` (same as primary).

### Form Inputs
```
bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm
focus: border-[#1B3A6B] ring-2 ring-[#EEF3FB]
placeholder: text-[#94A3B8]
```

### Upload Zone
Uses `.upload-zone` class — dashed border that turns navy on hover/drag.

---

## Icons
All icons are **inline SVG React components** defined at the top of whichever file uses them. No icon library is installed.

Standard icon props pattern:
```tsx
function XxxIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">...</svg>
}
```

Current icons in use:
- `BrickIcon` — LEGO build type
- `PencilIcon` — Drawing build type
- `ClockIcon` — Timer section
- `UsersIcon` — Players section
- `CameraIcon` — Photo upload placeholder
- `MicIcon` — Commentary sidebar
- `ScaleIcon` — Judging screen
- `AlertIcon` — Error state
- `TrophyIcon` — Winner reveal / Results
- `CheckIcon` — Upload confirmed badge
- `PlusIcon` — Custom challenge button
- `ArrowRightIcon` — Start button
- `RefreshIcon` — Play Again button

---

## Animations
Keep animations **purposeful and brief**. Allowed:
- `animate-[slideUp_0.4s_ease-out]` — new commentary items appearing
- `animate-[bounceIn_0.6s_ease-out]` — winner card reveal
- `animate-[slideUp_0.5s_ease-out]` — scores phase appearing
- Timer ring `stroke-dashoffset` transition (1s linear) — CSS class `.timer-ring`
- Score bars width transition (1.2s spring) — CSS class `.score-bar`
- Confetti fall — only on winner reveal, auto-clears after 6s

Do not add: glows, pulsing halos, particle systems, background blobs, shimmer effects.

---

## Audience View (Projector Screen)
The `/audience` route is shown on a large screen. Design considerations:
- Use larger text sizes (`text-6xl`, `text-8xl` for challenge/winner name)
- White background, same navy palette
- Same `.card` / `.card-raised` patterns
- Timer ring is larger (180×180px vs 112×112px on host)
- Player cards use `aspect-square` for visual balance on big screens
