'use client'

import { useEffect, useRef, useState, use } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CAPTURE_INTERVAL = 8000 // ms between frame uploads

type Status = 'loading' | 'permission' | 'live' | 'error' | 'done'

export default function PhoneCameraPage({
  params,
}: {
  params: Promise<{ gameId: string; playerId: string }>
}) {
  const { gameId, playerId } = use(params)

  const [status, setStatus] = useState<Status>('loading')
  const [playerName, setPlayerName] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [frameCount, setFrameCount] = useState(0)
  const [gamePhase, setGamePhase] = useState<string>('waiting')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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

    // Watch game phase changes
    const channel = supabase
      .channel(`phone-game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const phase = (payload.new as { phase: string }).phase
          setGamePhase(phase)
          if (phase === 'judging' || phase === 'results') {
            stopCapture()
            setStatus('done')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId, playerId])

  const stopCapture = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
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
      startCapturing()
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
      await supabase.from('players').update({ photo_path: path }).eq('id', playerId)
      setFrameCount(c => c + 1)
    }
  }

  const startCapturing = () => {
    captureAndUpload() // immediate first frame
    intervalRef.current = setInterval(captureAndUpload, CAPTURE_INTERVAL)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCapture()
  }, [])

  const isPlaying = gamePhase === 'playing'

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

        {status === 'live' && (
          <div className="space-y-4">
            {/* Live preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Live badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-white">LIVE</span>
              </div>
            </div>

            {/* Frame counter */}
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-white/60">Frames sent</span>
              <span className="text-sm font-bold text-white tabular-nums">{frameCount}</span>
            </div>

            <p className="text-center text-xs text-white/30">
              Uploading every {CAPTURE_INTERVAL / 1000}s · keep this tab open
            </p>
          </div>
        )}

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
