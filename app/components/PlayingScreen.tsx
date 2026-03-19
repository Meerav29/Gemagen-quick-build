'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { GameConfig, CommentaryEntry, Player } from '../types'
import { supabase } from '../../lib/supabase'

interface PlayingScreenProps {
  config: GameConfig
  gameId: string
  onTimeUp: (updatedPlayers: Player[]) => void
}

const COMMENTARY_INTERVAL = 18000
const PLAYER_COLORS = ['#1B3A6B', '#2563EB', '#0891B2', '#7C3AED']

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

function BrickIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="16" height="9" rx="1.5" />
      <rect x="5" y="4" width="3.5" height="3" rx="0.75" />
      <rect x="11.5" y="4" width="3.5" height="3" rx="0.75" />
    </svg>
  )
}

function PencilIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 3l4 4L7 17H3v-4L13 3z" strokeLinejoin="round" />
    </svg>
  )
}

function QrIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="7" height="7" rx="1" />
      <rect x="11" y="2" width="7" height="7" rx="1" />
      <rect x="2" y="11" width="7" height="7" rx="1" />
      <rect x="4" y="4" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="13" y="4" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="4" y="13" width="3" height="3" fill="currentColor" stroke="none" />
      <path d="M11 14h2v2h-2zM14 11h2v2h-2zM17 14h-1v3h-3v-3h1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

async function photoPathToBase64(path: string): Promise<{ dataUrl: string; base64: string } | null> {
  try {
    const { data } = supabase.storage.from('player-photos').getPublicUrl(path)
    const response = await fetch(data.publicUrl)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        resolve({ dataUrl, base64: dataUrl.split(',')[1] })
      }
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export default function PlayingScreen({ config, gameId, onTimeUp }: PlayingScreenProps) {
  const [timeLeft, setTimeLeft] = useState(config.timerSeconds)
  const [players, setPlayers] = useState<Player[]>(config.players)
  const [commentary, setCommentary] = useState<CommentaryEntry[]>([])
  const [isLoadingCommentary, setIsLoadingCommentary] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [joinUrl, setJoinUrl] = useState('')
  const [joinPanelOpen, setJoinPanelOpen] = useState(true)
  const commentaryRef = useRef<HTMLDivElement>(null)
  const previousCommentsRef = useRef<string[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const commentaryTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasEndedRef = useRef(false)

  // Set join URL on mount (client-only)
  useEffect(() => {
    setJoinUrl(`${window.location.origin}/play/${gameId}`)
  }, [gameId])

  // Set game to 'playing' in Supabase and start timers
  useEffect(() => {
    supabase.from('games').update({
      phase: 'playing',
      started_at: new Date().toISOString(),
    }).eq('id', gameId).then(() => {
      setTimeout(() => setGameStarted(true), 500)
    })
  }, [gameId])

  // Auto-collapse join panel once all players have photos
  useEffect(() => {
    if (players.every(p => p.photoBase64)) setJoinPanelOpen(false)
  }, [players])

  // Timer
  useEffect(() => {
    if (!gameStarted) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          if (!hasEndedRef.current) {
            hasEndedRef.current = true
            supabase.from('games').update({ phase: 'judging' }).eq('id', gameId)
            setTimeout(() => {
              setPlayers(curr => { onTimeUp(curr); return curr })
            }, 800)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [gameStarted, gameId, onTimeUp])

  // Supabase Realtime: watch for player photo uploads
  useEffect(() => {
    const channel = supabase
      .channel(`players-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        async (payload) => {
          const { id, photo_path } = payload.new as { id: string; photo_path: string | null }
          if (!photo_path) return
          const result = await photoPathToBase64(photo_path)
          if (!result) return
          setPlayers(prev =>
            prev.map(p => p.id === id ? { ...p, photoDataUrl: result.dataUrl, photoBase64: result.base64 } : p)
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  const fetchCommentary = useCallback(async (currentPlayers: Player[]) => {
    const playersWithPhotos = currentPlayers.filter(p => p.photoBase64)
    if (playersWithPhotos.length === 0) return
    setIsLoadingCommentary(true)
    try {
      const res = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: playersWithPhotos,
          challenge: config.challenge,
          buildType: config.buildType,
          previousComments: previousCommentsRef.current,
        }),
      })
      const data = await res.json()
      if (data.success && data.commentary) {
        const entry: CommentaryEntry = {
          id: Date.now().toString(),
          playerName: data.playerName,
          text: data.commentary,
          timestamp: Date.now(),
        }
        previousCommentsRef.current = [...previousCommentsRef.current.slice(-5), data.commentary]
        setCommentary(prev => {
          const updated = [entry, ...prev].slice(0, 8)
          // Persist commentary to Supabase for AudienceView
          supabase.from('games').update({ commentary: updated }).eq('id', gameId)
          return updated
        })
        setTimeout(() => commentaryRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100)
      }
    } catch (e) {
      console.error('Commentary fetch failed:', e)
    } finally {
      setIsLoadingCommentary(false)
    }
  }, [config.challenge, config.buildType, gameId])

  // Commentary interval
  useEffect(() => {
    if (!gameStarted) return
    commentaryTimerRef.current = setInterval(() => {
      setPlayers(curr => { fetchCommentary(curr); return curr })
    }, COMMENTARY_INTERVAL)
    return () => clearInterval(commentaryTimerRef.current!)
  }, [gameStarted, fetchCommentary])

  const progress = timeLeft / config.timerSeconds
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const timerColor = timeLeft > 30 ? '#16A34A' : timeLeft > 15 ? '#D97706' : '#DC2626'
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const allPlayersReady = players.every(p => p.photoBase64)

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E2E8F0] shadow-sm px-6 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-0.5">Challenge</div>
          <div className="font-display text-xl font-bold text-[#1B3A6B]">{config.challenge}</div>
        </div>

        {/* Timer ring */}
        <div className="relative flex items-center justify-center">
          <svg width="112" height="112" className="-rotate-90">
            <circle cx="56" cy="56" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="5" />
            <circle
              cx="56" cy="56" r={radius}
              fill="none"
              stroke={timerColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="timer-ring"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-display text-xl font-bold tabular-nums leading-none" style={{ color: timerColor }}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-[9px] text-[#94A3B8] uppercase tracking-widest mt-0.5">
              {timeLeft === 0 ? 'TIME!' : 'left'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-0.5">Build Type</div>
          <div className="flex items-center gap-1.5 justify-end text-sm font-semibold text-[#1B3A6B]">
            {config.buildType === 'lego' ? <><BrickIcon /> LEGO</> : <><PencilIcon /> Drawing</>}
          </div>
        </div>
      </div>

      {/* Join panel */}
      {joinUrl && (
        <div className="bg-[#1B3A6B] text-white">
          <div className="px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrIcon className="w-4 h-4 opacity-70" />
              <span className="text-sm font-semibold tracking-wide">
                Players join at: <span className="font-mono text-[#93C5FD]">{joinUrl}</span>
              </span>
              <span className="bg-white/20 text-white text-xs font-bold font-mono px-2 py-0.5 rounded tracking-widest">
                {gameId}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs opacity-60">
                {players.filter(p => p.photoBase64).length}/{players.length} ready
              </span>
              <button
                onClick={() => setJoinPanelOpen(o => !o)}
                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
              >
                {joinPanelOpen ? 'Hide ▲' : 'Show ▼'}
              </button>
            </div>
          </div>

          {joinPanelOpen && (
            <div className="px-6 pb-4 flex items-start gap-6 border-t border-white/10 pt-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(joinUrl)}&size=120x120&bgcolor=1B3A6B&color=ffffff&margin=4`}
                alt="QR code"
                className="rounded-lg flex-shrink-0"
                width={120}
                height={120}
              />
              <div className="flex-1">
                <p className="text-sm opacity-70 mb-3">Each player scans and taps their name to upload a photo</p>
                <div className="flex flex-wrap gap-2">
                  {players.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: p.photoBase64 ? '#16A34A33' : '#ffffff22', color: p.photoBase64 ? '#86EFAC' : '#ffffff99' }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: PLAYER_COLORS[i] }}
                      >{i + 1}</span>
                      {p.name}
                      {p.photoBase64 && ' ✓'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row">

        {/* Players grid */}
        <div className="flex-1 p-5">
          <div className={`grid gap-4 h-full ${players.length === 2 ? 'grid-cols-2' : players.length === 3 ? 'grid-cols-3' : 'grid-cols-2 grid-rows-2'}`}>
            {players.map((player, idx) => (
              <PlayerCard
                key={player.id}
                player={player}
                index={idx}
                gameId={gameId}
                isActive={timeLeft > 0}
                allReady={allPlayersReady}
              />
            ))}
          </div>
        </div>

        {/* Commentary sidebar */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-[#E2E8F0] flex flex-col bg-white">
          <div className="p-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${isLoadingCommentary ? 'bg-[#1B3A6B] animate-pulse' : 'bg-[#CBD5E1]'}`} />
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                <MicIcon className="w-3.5 h-3.5" /> Live Commentary
              </span>
            </div>
          </div>

          <div ref={commentaryRef} className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[200px] lg:min-h-0">
            {commentary.length === 0 && (
              <div className="text-center py-10">
                <MicIcon className="w-8 h-8 text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Commentary starts once players upload their first photos
                </p>
              </div>
            )}
            {commentary.map(entry => (
              <div key={entry.id} className="commentary-item card-raised p-3">
                <div className="text-xs font-semibold text-[#1B3A6B] mb-1">{entry.playerName}</div>
                <p className="text-sm text-[#475569] leading-relaxed">{entry.text}</p>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#E2E8F0]">
            <button
              onClick={() => fetchCommentary(players)}
              disabled={isLoadingCommentary || players.every(p => !p.photoBase64)}
              className="w-full py-2 text-xs font-medium btn-ghost rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <MicIcon className="w-3.5 h-3.5" />
              {isLoadingCommentary ? 'Generating...' : 'Get Commentary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerCard({
  player, index, gameId, isActive, allReady
}: {
  player: Player
  index: number
  gameId: string
  isActive: boolean
  allReady: boolean
}) {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length]

  return (
    <div className="card flex flex-col overflow-hidden">
      {/* Player name bar */}
      <div
        className="px-3 py-2.5 flex items-center gap-2 border-b border-[#E2E8F0]"
        style={{ background: `${color}0d` }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: color }}
        >
          {index + 1}
        </div>
        <span className="font-semibold text-sm truncate" style={{ color }}>{player.name}</span>
        {player.photoDataUrl && (
          <span className="ml-auto flex items-center gap-1 text-xs text-[#16A34A] font-medium flex-shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 8 7 12 13 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ready
          </span>
        )}
      </div>

      {/* Photo area */}
      <div className="flex-1 relative min-h-[140px]">
        {player.photoDataUrl ? (
          <img
            src={player.photoDataUrl}
            alt={`${player.name}'s build`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#F8FAFC] p-4 text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ background: color }}
            >
              {index + 1}
            </div>
            <p className="text-xs text-[#94A3B8]">
              {isActive
                ? `Waiting for ${player.name} to upload...`
                : "Time's up!"}
            </p>
            <a
              href={`/play/${gameId}/${player.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#1B3A6B] underline opacity-60 hover:opacity-100"
            >
              Open player page ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
