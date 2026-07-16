# WebRTC Live Video — Implementation Plan

## What This Replaces
Phone mode currently uploads a JPEG to Supabase Storage every 2.5s. This plan replaces that with a WebRTC peer connection so the host sees a live video stream from each player's phone. The JPEG polling path is kept as an automatic fallback.

## Key Decisions

### Signaling via Supabase Broadcast (not a new table)
WebRTC requires a signaling channel to exchange SDP offers/answers and ICE candidates. We use Supabase Realtime **broadcast channels** (already in the project) rather than a new `webrtc_signals` DB table. Reasons:
- No schema migration needed for signaling
- Broadcast is ~50-100ms vs. WAL-based postgres_changes
- Stale signaling messages are harmful; broadcast is fire-and-forget with no persistence

Channel naming: `webrtc-{gameId}-{playerId}` — one channel per player.

### No TURN Server
Uses Google's free STUN servers only. Works when phone and host are on the same WiFi (classroom use case). If they're on different networks, the 15s fallback to JPEG polling kicks in automatically.

### `captureMode: 'phone'` stays the same
No new capture mode type. The QR code / phone URL flow is unchanged. Only the transport layer changes inside the existing phone mode.

---

## Schema Change (SQL Editor)

```sql
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS webrtc_state text DEFAULT 'none';
-- values: 'none' | 'connecting' | 'connected' | 'failed' | 'fallback'
```

No new RLS policies needed — the existing anon UPDATE policy on `players` already covers this column.

---

## New File: `lib/webrtc.ts`

Pure utility module (no React). Keeps WebRTC config and connection factory functions out of the component files.

```ts
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
}
```

Exports:
- `createPhonePeerConnection(localStream, onIceCandidate)` → `RTCPeerConnection`
- `createHostPeerConnection(onTrack, onIceCandidate, onStateChange)` → `RTCPeerConnection`
- `captureFrameFromVideo(video)` → `string | null` (base64 JPEG)

---

## Signaling Flow

```
PHONE                                    HOST
─────                                    ────
getUserMedia() → stream
addTrack(stream tracks)
channel.subscribe()
  └─ on SUBSCRIBED:
       createOffer()
       setLocalDescription(offer)
       broadcast 'offer' ──────────────► on 'offer':
                                           createHostPeerConnection()
                                           setRemoteDescription(offer)
                                           createAnswer()
                                           setLocalDescription(answer)
                          ◄────────────── broadcast 'answer'
setRemoteDescription(answer)
flush queued ICE candidates

pc.onicecandidate ──────────────────────► addIceCandidate()
                  ◄────────────────────── pc.onicecandidate

pc.connectionState = 'connected' ◄──────► pc.ontrack fires
setWebrtcState('connected')               remoteStreamsRef[playerId] = stream
                                          video.srcObject = stream  ✓ LIVE
```

### ICE Candidate Queueing
The phone may receive `ice-candidate-host` messages before `setRemoteDescription` completes. Solution: queue candidates in `pendingHostCandidatesRef` and flush them after the answer is applied.

---

## Changes: `app/camera/[gameId]/[playerId]/page.tsx`

### Remove
- `CAPTURE_INTERVAL` constant
- `captureAndUpload()` function
- `startCapturing()` function
- `intervalRef` (moved to fallback only)
- `frameCount` state (replaced by WebRTC state badge)
- Debug log state and UI

### Add
```ts
const pcRef = useRef<RTCPeerConnection | null>(null)
const signalingChannelRef = useRef<...>(null)
const pendingHostCandidatesRef = useRef<RTCIceCandidateInit[]>([])
const webrtcTimeoutRef = useRef<NodeJS.Timeout | null>(null)
const [webrtcState, setWebrtcState] = useState<'idle'|'connecting'|'connected'|'failed'>('idle')
```

### Replace `startCapturing()` with `startWebRTC(stream)`
Called from `startCamera()` instead of `startCapturing()`. Opens the broadcast channel, creates `RTCPeerConnection`, adds tracks, handles ICE, waits for `SUBSCRIBED` then sends offer.

### Add `triggerFallback()`
Called when `pc.connectionState === 'failed'` OR after 15s timeout with no connection:
1. Writes `webrtc_state = 'fallback'` to `players` table
2. Falls back to `startCapturing()` (the old interval-upload loop)

### UI
Replace "Frames sent: N" with a WebRTC state badge: `idle / connecting / connected / failed`

---

## Changes: `app/components/PlayingScreen.tsx`

### New refs
```ts
const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({})
const remoteStreamsRef = useRef<Record<string, MediaStream>>({})
const signalingChannelsRef = useRef<Record<string, RealtimeChannel>>({})
```

### Replace the phone-mode Realtime subscription (lines 298-317)
Current: watches `players.photo_path` via `postgres_changes`.
New: opens one broadcast channel per player, listens for `'offer'` and `'ice-candidate-phone'`.

### Add `handleOffer(playerId, offerSdp)`
Creates `RTCPeerConnection`, sets remote description, creates and sends answer, wires `ontrack` to set `video.srcObject = stream`.

### Timer expiry + commentary — include phone mode
```ts
// Change:
const finalPlayers = isCameraMode ? buildPlayersWithFrames(curr) : curr
// To:
const finalPlayers = (isCameraMode || isPhoneMode) ? buildPlayersWithFrames(curr) : curr
```
`buildPlayersWithFrames` reads from `videoRefs.current[playerId]` — which in phone WebRTC mode has `srcObject` = remote stream. No other change needed. The canvas capture works identically to local camera mode.

### Keep fallback photo subscription
A separate `postgres_changes` subscription (scoped to `webrtc_state = 'fallback'` players) stays alive so fallback players' JPEG frames are still picked up by the host.

### PlayerCard
Treat `captureMode === 'phone'` same as `captureMode === 'camera'` in the video rendering branch. When `hasRemoteStream` is false, show a connecting spinner. When fallback `player.photoDataUrl` exists, show the JPEG.

### Join panel live count
```ts
// Before: players.filter(p => p.photoBase64).length
// After (phone mode): activeStreamCount
```

---

## How AI Judging Still Works

`onTimeUp` is called with `buildPlayersWithFrames(players)`. This snapshots the current frame from `videoRefs.current[playerId]` for each player — works identically for local webcam and phone WebRTC because both use `video.srcObject = MediaStream`. Fallback players already have `player.photoBase64` from JPEG polling.

No changes to `/api/judge` or `/api/commentary`.

---

## Implementation Sequence

1. **SQL** — Add `webrtc_state` column to `players`. Verify existing polling still works.
2. **`lib/webrtc.ts`** — Create utility file. No behavior change yet.
3. **Phone page** — Replace `startCapturing()` with `startWebRTC()`. Keep fallback path. Test signaling in isolation.
4. **`PlayingScreen.tsx`** — Add host-side WebRTC setup (`handleOffer`, channel subscriptions). Wire `videoRefs` to remote streams.
5. **Timer + commentary** — Extend `buildPlayersWithFrames` usage to `isPhoneMode`.
6. **Fallback** — Add 15s timeout on phone. Add fallback photo subscription on host. Test by blocking network.
7. **UI polish** — Connecting spinner in PlayerCard, updated live count in join panel.
8. **Update `CLAUDE.md`** — Document WebRTC signaling approach and TURN server limitation.

---

## What's Not Changing
- `app/types.ts` — untouched
- `captureMode: 'phone'` value — untouched
- `/camera/[gameId]/[playerId]` route — same URL
- QR code generation — unchanged
- Local webcam mode (`isCameraMode`) — unaffected
- Upload mode — unaffected
- Audience view — continues to work via `pushFramesToSupabase`
- `/api/judge` and `/api/commentary` — unchanged

---

## Known Limitation
No TURN server. If phone and host are on different networks (e.g. phone on cellular, host on school ethernet), STUN-only will fail and the 15s fallback to JPEG polling will activate. For the classroom use case (same WiFi) this is acceptable. A future improvement would be to add a TURN server (Metered, Twilio, or self-hosted coturn).
