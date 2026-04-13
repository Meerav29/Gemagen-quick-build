'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { createPhonePeerConnection } from '../../../../lib/webrtc'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Fallback JPEG polling interval (used only if WebRTC fails)
const FALLBACK_INTERVAL = 2500

type Status = 'loading' | 'permission' | 'live' | 'error' | 'done'
type WebRTCState = 'idle' | 'connecting' | 'connected' | 'failed'

export default function PhoneCameraPage({
  params,
}: {
  params: { gameId: string; playerId: string }
}) {
  const { gameId, playerId } = params

  const [status, setStatus] = useState<Status>('loading')
  const [playerName, setPlayerName] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [gamePhase, setGamePhase] = useState<string>('waiting')
  const [webrtcState, setWebrtcState] = useState<WebRTCState>('idle')
  const [isFallback, setIsFallback] = useState(false)
  const [fallbackFrames, setFallbackFrames] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const webrtcTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingHostCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  // Load player name and watch game phase
  useEffect(() => {
    const load = async () => {
      const { data: player } = await supabase
        .from('players')
        .select('name')
        .eq('id', playerId)
        .single()

      if (!player) {
        setErrorMsg('Player not found. Check your link.')
        setStatus('error')
        return
      }
      setPlayerName(player.name)

      const { data: game } = await supabase
        .from('games')
        .select('phase')
        .eq('id', gameId)
        .single()

      if (game) setGamePhase(game.phase)
      setStatus('permission')
    }

    load()

    const channel = supabase
      .channel(`phone-game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const phase = (payload.new as { phase: string }).phase
          setGamePhase(phase)
          if (phase === 'judging' || phase === 'results') {
            stopAll()
            setStatus('done')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId, playerId])

  const stopAll = () => {
    // WebRTC teardown
    clearTimeout(webrtcTimeoutRef.current!)
    pcRef.current?.close()
    pcRef.current = null
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current)
      signalingChannelRef.current = null
    }
    // Fallback interval
    clearInterval(intervalRef.current!)
    // Camera stream
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  // Fallback: JPEG upload polling
  const captureAndUpload = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    const base64 = dataUrl.split(',')[1]
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const path = `${gameId}/${playerId}.jpg`

    const { error } = await supabase.storage
      .from('player-photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true })

    if (!error) {
      await supabase.from('players').update({ photo_path: path, webrtc_state: 'fallback' }).eq('id', playerId)
      signalingChannelRef.current?.send({
        type: 'broadcast',
        event: 'fallback-frame',
        payload: { path },
      })
      setFallbackFrames(c => c + 1)
    }
  }

  const triggerFallback = async () => {
    clearTimeout(webrtcTimeoutRef.current!)
    pcRef.current?.close()
    pcRef.current = null
    // Keep signalingChannelRef open — reused to broadcast fallback frames to the dashboard
    await supabase.from('players').update({ webrtc_state: 'fallback' }).eq('id', playerId)
    setWebrtcState('failed')
    setIsFallback(true)
    captureAndUpload()
    intervalRef.current = setInterval(captureAndUpload, FALLBACK_INTERVAL)
  }

  const startWebRTC = async (stream: MediaStream) => {
    const channel = supabase.channel(`webrtc-${gameId}-${playerId}`)
    signalingChannelRef.current = channel

    const pc = createPhonePeerConnection(stream, (candidate) => {
      channel.send({
        type: 'broadcast',
        event: 'ice-candidate-phone',
        payload: candidate.toJSON(),
      })
    })
    pcRef.current = pc

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'connected') {
        clearTimeout(webrtcTimeoutRef.current!)
        setWebrtcState('connected')
        supabase.from('players').update({ webrtc_state: 'connected' }).eq('id', playerId)
      }
      if (state === 'failed' || state === 'disconnected') {
        triggerFallback()
      }
    }

    channel
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (!pc.remoteDescription) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload))
            // Flush any queued host ICE candidates
            for (const c of pendingHostCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
            }
            pendingHostCandidatesRef.current = []
          } catch { /* ignore */ }
        }
      })
      .on('broadcast', { event: 'ice-candidate-host' }, async ({ payload }) => {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload)).catch(() => {})
        } else {
          pendingHostCandidatesRef.current.push(payload)
        }
      })
      .subscribe(async (subscribeStatus) => {
        if (subscribeStatus !== 'SUBSCRIBED') return
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { type: offer.type, sdp: offer.sdp },
          })
          setWebrtcState('connecting')

          // Fallback if no connection within 15s
          webrtcTimeoutRef.current = setTimeout(() => {
            if (pc.connectionState !== 'connected') triggerFallback()
          }, 15000)
        } catch {
          triggerFallback()
        }
      })

    await supabase.from('players').update({ webrtc_state: 'connecting' }).eq('id', playerId)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('live')
      await startWebRTC(stream)
    } catch (err) {
      const domErr = err as DOMException
      if (domErr.name === 'NotAllowedError') {
        setErrorMsg('Camera permission denied. Tap the camera icon in your browser address bar to allow access.')
      } else if (domErr.name === 'NotFoundError') {
        setErrorMsg('No camera found on this device.')
      } else {
        setErrorMsg('Could not start camera. Try refreshing the page.')
      }
      setStatus('error')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAll()
  }, [])

  const isPlaying = gamePhase === 'playing'

  const webrtcBadge = {
    idle:       { label: 'Starting…',   color: 'text-white/40' },
    connecting: { label: 'Connecting…', color: 'text-yellow-400' },
    connected:  { label: 'Live',        color: 'text-green-400' },
    failed:     { label: 'Fallback',    color: 'text-orange-400' },
  }[webrtcState]

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center px-6 py-10 text-white">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-[#93C5FD] bg-white/10 border border-white/20 rounded-full mb-4">
          IST 130 · Quick Build
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">
          {playerName || '…'}
        </h1>
        <p className="text-sm text-white/50">Game · {gameId}</p>
      </div>

      {/* Status card */}
      <div className="w-full max-w-sm">

        {status === 'loading' && (
          <div className="text-center py-12 text-white/40 text-sm">Loading…</div>
        )}

        {status === 'permission' && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-[#1B3A6B] rounded-full flex items-center justify-center mx-auto">
              <CameraIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-white mb-1">Ready to go live</p>
              <p className="text-sm text-white/50">
                {isPlaying
                  ? 'The game is live. Tap below to start your camera.'
                  : 'Waiting for the host to start. Tap below to allow camera access.'}
              </p>
            </div>
            <button
              onClick={startCamera}
              className="w-full py-3.5 bg-[#1B3A6B] hover:bg-[#2D5BA3] text-white font-semibold rounded-xl transition-colors"
            >
              Allow Camera
            </button>
          </div>
        )}

        {/* Video element always in DOM so ref is available when stream attaches */}
        <div className={status === 'live' ? 'space-y-4' : 'hidden'}>
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <span className={`w-2 h-2 rounded-full animate-pulse ${webrtcState === 'connected' ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <span className="text-xs font-semibold text-white">LIVE</span>
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-white/60">
              {isFallback ? 'Frames sent' : 'Connection'}
            </span>
            <span className={`text-sm font-bold tabular-nums ${webrtcBadge.color}`}>
              {isFallback ? fallbackFrames : webrtcBadge.label}
            </span>
          </div>

          <p className="text-center text-xs text-white/30">
            {isFallback ? `Uploading every ${FALLBACK_INTERVAL / 1000}s · keep this tab open` : 'Streaming live · keep this tab open'}
          </p>
        </div>

        {status === 'error' && (
          <div className="bg-red-950/50 border border-red-500/30 rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-red-300">Camera unavailable</p>
            <p className="text-xs text-red-400/80 leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => { setStatus('permission'); setErrorMsg('') }}
              className="text-xs text-white/50 underline"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'done' && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center space-y-3">
            <div className="w-14 h-14 bg-green-600/30 rounded-full flex items-center justify-center mx-auto">
              <CheckIcon className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-base font-semibold text-white">Time's up!</p>
            <p className="text-sm text-white/50">The host is judging your build. Check the main screen for results.</p>
          </div>
        )}

      </div>
    </div>
  )
}

function CameraIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" strokeLinejoin="round" />
      <path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
