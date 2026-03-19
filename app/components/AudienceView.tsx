'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Shown on a projector/big screen.
// Reads gameId from localStorage key 'quickbuild_game_id' (written by host on game start).
// Subscribes to Supabase Realtime for live game + player updates.

interface AudienceGame {
  id: string
  challenge: string
  build_type: 'lego' | 'drawing'
  timer_seconds: number
  phase: 'waiting' | 'playing' | 'judging' | 'results'
  started_at: string | null
  commentary: { playerName: string; text: string; id: string }[]
  judging_result: {
    scores: Record<string, { playerName: string; score: number }>
    overallWinner: { playerName: string; winnerReasoning: string }
    winnerAnnouncementScript: string
  } | null
}

interface AudiencePlayer {
  id: string
  name: string
  player_number: number
  photo_path: string | null
}

const PLAYER_COLORS = ['#1B3A6B', '#2563EB', '#0891B2', '#7C3AED']

function ScaleIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="3" x2="12" y2="21" strokeLinecap="round" />
      <path d="M6 11L3 18h6L6 11z" strokeLinejoin="round" />
      <path d="M18 11l-3 7h6l-3-7z" strokeLinejoin="round" />
      <line x1="3" y1="11" x2="21" y2="11" strokeLinecap="round" />
      <line x1="8" y1="21" x2="16" y2="21" strokeLinecap="round" />
    </svg>
  )
}

function TrophyIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3h12v7a6 6 0 01-12 0V3z" strokeLinejoin="round" />
      <path d="M6 6H3a2 2 0 000 4h3" strokeLinecap="round" />
      <path d="M18 6h3a2 2 0 010 4h-3" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="20" strokeLinecap="round" />
      <line x1="8" y1="20" x2="16" y2="20" strokeLinecap="round" />
    </svg>
  )
}

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

function BrickIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="16" height="9" rx="1.5" />
      <rect x="5" y="4" width="3.5" height="3" rx="0.75" />
      <rect x="11.5" y="4" width="3.5" height="3" rx="0.75" />
    </svg>
  )
}

function PencilIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 3l4 4L7 17H3v-4L13 3z" strokeLinejoin="round" />
    </svg>
  )
}

function getPhotoUrl(path: string): string {
  return supabase.storage.from('player-photos').getPublicUrl(path).data.publicUrl
}

export default function AudienceView() {
  const [game, setGame] = useState<AudienceGame | null>(null)
  const [players, setPlayers] = useState<AudiencePlayer[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Derive timeLeft from started_at + timer_seconds (no Supabase writes for timer)
  const startLocalTimer = (timerSeconds: number, startedAt: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      const remaining = Math.max(0, timerSeconds - elapsed)
      setTimeLeft(remaining)
      if (remaining === 0) clearInterval(timerRef.current!)
    }, 500)
  }

  useEffect(() => {
    // Get current gameId from localStorage (written by host when game starts)
    let gameId: string | null = null
    try { gameId = localStorage.getItem('quickbuild_game_id') } catch {}

    const loadGame = async (id: string) => {
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single()
      if (gameData) {
        setGame(gameData)
        if (gameData.phase === 'playing' && gameData.started_at) {
          setTimeLeft(Math.max(0, gameData.timer_seconds - Math.floor((Date.now() - new Date(gameData.started_at).getTime()) / 1000)))
          startLocalTimer(gameData.timer_seconds, gameData.started_at)
        }
      }

      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', id)
        .order('player_number')
      if (playerData) setPlayers(playerData)
    }

    // If no gameId yet, poll localStorage until host starts a game
    if (!gameId) {
      const poll = setInterval(() => {
        try {
          const id = localStorage.getItem('quickbuild_game_id')
          if (id) { clearInterval(poll); loadGame(id); subscribeToGame(id) }
        } catch {}
      }, 1000)
      return () => clearInterval(poll)
    } else {
      loadGame(gameId)
      subscribeToGame(gameId)
    }

    function subscribeToGame(id: string) {
      // Subscribe to game row changes
      const gameChannel = supabase
        .channel(`audience-game-${id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` },
          (payload) => {
            const updated = payload.new as AudienceGame
            setGame(updated)
            if (updated.phase === 'playing' && updated.started_at) {
              startLocalTimer(updated.timer_seconds, updated.started_at)
            } else {
              if (timerRef.current) clearInterval(timerRef.current)
            }
          }
        )
        .subscribe()

      // Subscribe to player photo updates
      const playerChannel = supabase
        .channel(`audience-players-${id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'players', filter: `game_id=eq.${id}` },
          (payload) => {
            const updated = payload.new as AudiencePlayer
            setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(gameChannel)
        supabase.removeChannel(playerChannel)
      }
    }
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Waiting / no game yet
  if (!game || game.phase === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-[#1B3A6B] bg-[#EEF3FB] border border-[#C7D9F0] rounded-full mb-8">
            IST 130 · AI &amp; Art
          </div>
          <h1 className="font-display font-bold text-[13vw] leading-none tracking-tight text-[#0F172A]">
            Quick<br /><span className="text-[#1B3A6B]">Build</span>
          </h1>
          <p className="mt-6 text-2xl text-[#64748B]">
            Waiting for the host to start…
          </p>
          <div className="mt-8 flex gap-2.5 justify-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-[#1B3A6B] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (game.phase === 'playing') {
    const radius = 80
    const circumference = 2 * Math.PI * radius
    const progress = timeLeft / game.timer_seconds
    const dashOffset = circumference * (1 - progress)
    const timerColor = timeLeft > 30 ? '#16A34A' : timeLeft > 15 ? '#D97706' : '#DC2626'

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-12 py-6 bg-white border-b border-[#E2E8F0] shadow-sm">
          <div>
            <div className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider mb-1">Build a...</div>
            <h2 className="font-display text-6xl font-bold text-[#1B3A6B]">{game.challenge}</h2>
          </div>

          <div className="relative flex items-center justify-center">
            <svg width="180" height="180" className="-rotate-90">
              <circle cx="90" cy="90" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="7" />
              <circle
                cx="90" cy="90" r={radius}
                fill="none"
                stroke={timerColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-display text-5xl font-bold tabular-nums" style={{ color: timerColor }}>
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs text-[#94A3B8] uppercase tracking-widest">left</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider mb-1">Mode</div>
            <div className="flex items-center gap-2 justify-end text-[#1B3A6B]">
              {game.build_type === 'lego' ? <BrickIcon /> : <PencilIcon />}
              <span className="font-display text-3xl font-bold">
                {game.build_type === 'lego' ? 'LEGO' : 'Drawing'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Players */}
          <div className="flex-1 flex items-center justify-center p-10">
            <div className={`grid gap-6 w-full max-w-3xl ${players.length <= 2 ? 'grid-cols-2' : players.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {players.map((player, i) => {
                const color = PLAYER_COLORS[i % PLAYER_COLORS.length]
                const photoUrl = player.photo_path ? getPhotoUrl(player.photo_path) : null
                return (
                  <div
                    key={player.id}
                    className="card aspect-square flex flex-col overflow-hidden border-2"
                    style={{ borderColor: `${color}20` }}
                  >
                    <div className="px-4 py-3 flex items-center gap-2 border-b border-[#E2E8F0]" style={{ background: `${color}0d` }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: color }}>
                        {player.player_number}
                      </div>
                      <span className="font-display text-xl font-bold" style={{ color }}>{player.name}</span>
                    </div>
                    <div className="flex-1 relative">
                      {photoUrl ? (
                        <img src={photoUrl} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white" style={{ background: color }}>
                            {player.player_number}
                          </div>
                          <span className="text-sm text-[#94A3B8]">building…</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Commentary sidebar */}
          <div className="w-96 border-l border-[#E2E8F0] flex flex-col bg-white">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1B3A6B] animate-pulse" />
                <span className="text-sm font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <MicIcon /> Live Commentary
                </span>
              </div>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {game.commentary.length === 0 && (
                <p className="text-[#94A3B8] text-sm text-center py-8">Waiting for builds to appear…</p>
              )}
              {game.commentary.slice(0, 4).map(entry => (
                <div key={entry.id} className="card-raised p-4">
                  <div className="text-xs font-semibold text-[#1B3A6B] uppercase mb-2">{entry.playerName}</div>
                  <p className="text-base text-[#475569] leading-relaxed">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (game.phase === 'judging') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="relative w-40 h-40 mx-auto mb-10">
          <svg className="w-full h-full animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="#E2E8F0" strokeWidth="7" />
            <circle
              cx="80" cy="80" r="68"
              fill="none"
              stroke="#1B3A6B"
              strokeWidth="7"
              strokeDasharray="120 307"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <ScaleIcon className="w-16 h-16 text-[#1B3A6B]" />
          </div>
        </div>
        <h2 className="font-display text-8xl font-bold text-[#1B3A6B] mb-4">Judging</h2>
        <p className="text-2xl text-[#64748B]">The AI is deliberating…</p>
      </div>
    )
  }

  if (game.phase === 'results' && game.judging_result) {
    const { judging_result: result } = game
    const sortedScores = Object.values(result.scores).sort((a, b) => b.score - a.score)
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-12 py-10">
        <div className="text-center mb-10">
          <TrophyIcon className="w-16 h-16 text-[#1B3A6B] mx-auto mb-4" />
          <div className="text-lg font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Winner</div>
          <h2 className="font-display text-[11vw] font-bold leading-none text-[#1B3A6B]">
            {result.overallWinner.playerName}
          </h2>
        </div>

        {result.winnerAnnouncementScript && (
          <div className="card p-8 max-w-2xl text-center mb-10">
            <p className="text-xl text-[#475569] leading-relaxed">{result.winnerAnnouncementScript}</p>
          </div>
        )}

        <div className="flex gap-6">
          {sortedScores.map((ps, rank) => {
            const playerIdx = players.findIndex(p => p.name.toLowerCase() === ps.playerName.toLowerCase())
            const color = PLAYER_COLORS[playerIdx >= 0 ? playerIdx % PLAYER_COLORS.length : rank % PLAYER_COLORS.length]
            return (
              <div key={ps.playerName} className="card p-6 text-center min-w-[160px]">
                <div className="text-3xl mb-2">
                  {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '🎖️'}
                </div>
                <div className="font-display text-2xl font-bold mb-1" style={{ color }}>{ps.playerName}</div>
                <div className="font-display text-5xl font-bold" style={{ color }}>{ps.score}</div>
                <div className="text-sm text-[#94A3B8]">/ 10</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
