'use client'

import { useState, useEffect } from 'react'
import { GameConfig, JudgingResult, Player } from '../types'

interface ResultsScreenProps {
  config: GameConfig
  players: Player[]
  result: JudgingResult
  onPlayAgain: () => void
}

const SCORE_CRITERIA = [
  { key: 'colorScore', label: 'Color' },
  { key: 'structureScore', label: 'Structure' },
  { key: 'adherenceScore', label: 'Adherence' },
  { key: 'detailScore', label: 'Detail' },
] as const

const PLAYER_COLORS = ['#1B3A6B', '#2563EB', '#0891B2', '#7C3AED']
const MEDALS = ['🥇', '🥈', '🥉']

function TrophyIcon({ className = 'w-10 h-10' }: { className?: string }) {
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

function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9A8 8 0 1016 16" strokeLinecap="round" />
    </svg>
  )
}

export default function ResultsScreen({ config, players, result, onPlayAgain }: ResultsScreenProps) {
  const [phase, setPhase] = useState<'announcement' | 'scores' | 'winner'>('announcement')
  const [scriptIndex, setScriptIndex] = useState(0)
  const [showWinner, setShowWinner] = useState(false)
  const [confetti, setConfetti] = useState<{ id: number; x: number; color: string; size: number; duration: number; delay: number }[]>([])

  const scriptWords = result.winnerAnnouncementScript.split(' ')

  useEffect(() => {
    if (phase !== 'announcement') return
    if (scriptIndex >= scriptWords.length) {
      setTimeout(() => setPhase('scores'), 1500)
      return
    }
    const delay = scriptIndex === 0 ? 800 : 120
    const t = setTimeout(() => setScriptIndex(prev => prev + 1), delay)
    return () => clearTimeout(t)
  }, [phase, scriptIndex, scriptWords.length])

  useEffect(() => {
    if (phase !== 'scores') return
    const t = setTimeout(() => {
      setPhase('winner')
      setTimeout(() => { setShowWinner(true); spawnConfetti() }, 800)
    }, 4000)
    return () => clearTimeout(t)
  }, [phase])

  const spawnConfetti = () => {
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#1B3A6B', '#2563EB', '#0891B2', '#7C3AED', '#16A34A', '#D97706'][i % 6],
      size: Math.random() * 8 + 6,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 1.5,
    }))
    setConfetti(pieces)
    setTimeout(() => setConfetti([]), 6000)
  }

  const winnerPlayer = players.find(
    p => p.name.toLowerCase() === result.overallWinner.playerName.toLowerCase()
  )
  const getPlayerColor = (name: string) => {
    const idx = players.findIndex(p => p.name.toLowerCase() === name.toLowerCase())
    return PLAYER_COLORS[idx % PLAYER_COLORS.length]
  }

  const sortedScores = [...Object.values(result.scores)].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative overflow-hidden">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.x}%`,
            width: piece.size,
            height: piece.size,
            background: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">

        {/* Announcement phase */}
        {(phase === 'announcement' || phase === 'scores') && (
          <div className="mb-8">
            <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3 text-center">
              The Verdict
            </div>
            <div className="card p-6 text-center">
              <p className="text-lg md:text-xl text-[#0F172A] leading-relaxed">
                {scriptWords.slice(0, scriptIndex).map((word, i) => {
                  const isWinnerName = word.replace(/[^a-zA-Z]/g, '').toLowerCase() === result.overallWinner.playerName.toLowerCase()
                  return (
                    <span key={i} className={isWinnerName ? 'text-[#1B3A6B] font-bold font-display' : ''}>
                      {word}{' '}
                    </span>
                  )
                })}
                {scriptIndex < scriptWords.length && (
                  <span className="inline-block w-0.5 h-5 bg-[#1B3A6B] animate-pulse align-middle ml-0.5" />
                )}
              </p>
            </div>
          </div>
        )}

        {/* Scores phase */}
        {(phase === 'scores' || phase === 'winner') && (
          <div className="mb-8 animate-[slideUp_0.5s_ease-out]">
            <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3 text-center">
              Final Scores
            </div>
            <div className="space-y-3">
              {sortedScores.map((ps, rank) => {
                const player = players.find(p => p.name.toLowerCase() === ps.playerName.toLowerCase())
                const color = getPlayerColor(ps.playerName)
                const isWinner = ps.playerName.toLowerCase() === result.overallWinner.playerName.toLowerCase()
                return (
                  <div
                    key={ps.playerName}
                    className={`card p-4 ${isWinner ? 'ring-2 ring-[#1B3A6B]/20 border-[#C7D9F0]' : ''}`}
                    style={{ animationDelay: `${rank * 0.15}s` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-xl w-8 text-center flex-shrink-0 pt-0.5">
                        {MEDALS[rank] ?? '🎖️'}
                      </div>
                      {player?.photoDataUrl && (
                        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-[#E2E8F0] shadow-sm">
                          <img src={player.photoDataUrl} alt={ps.playerName} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm" style={{ color }}>{ps.playerName}</span>
                          <span className="font-display font-bold text-lg" style={{ color }}>
                            {ps.score}<span className="text-xs text-[#94A3B8] font-normal ml-0.5">/10</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {SCORE_CRITERIA.map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-[10px] text-[#94A3B8] w-16 flex-shrink-0">{label}</span>
                              <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full score-bar"
                                  style={{
                                    width: `${(ps[key] / 10) * 100}%`,
                                    background: color,
                                    transitionDelay: `${rank * 0.1 + 0.3}s`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-[#94A3B8] w-4 text-right">{ps[key]}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[#64748B] mt-2 leading-relaxed">{ps.scoringReasoning}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Winner reveal */}
        {phase === 'winner' && showWinner && (
          <div className="text-center animate-[bounceIn_0.6s_ease-out] mb-8">
            <div
              className="card p-8 inline-block"
              style={{ boxShadow: '0 8px 40px rgba(27,58,107,0.12)', border: '1.5px solid #C7D9F0' }}
            >
              <TrophyIcon className="w-12 h-12 text-[#1B3A6B] mx-auto mb-3" />
              <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Winner</div>
              <h2 className="font-display text-5xl font-bold text-[#1B3A6B] mb-1">
                {result.overallWinner.playerName}
              </h2>
              {winnerPlayer?.photoDataUrl && (
                <div className="mt-4 mx-auto w-28 h-28 rounded-xl overflow-hidden border-2 border-[#C7D9F0] shadow-md">
                  <img src={winnerPlayer.photoDataUrl} alt="winning build" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="mt-4 text-sm text-[#64748B] max-w-xs mx-auto leading-relaxed">
                {result.overallWinner.winnerReasoning}
              </p>
            </div>
          </div>
        )}

        {/* Play again */}
        {phase === 'winner' && showWinner && (
          <div className="text-center animate-[slideUp_0.5s_ease-out_0.5s_both]">
            <button
              onClick={onPlayAgain}
              className="btn-primary px-10 py-3.5 text-base flex items-center gap-2 mx-auto"
            >
              <RefreshIcon /> Play Again
            </button>
            <p className="mt-3 text-xs text-[#94A3B8]">
              {config.challenge} · {config.buildType === 'lego' ? 'LEGO' : 'Drawing'} · {config.timerSeconds}s
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
