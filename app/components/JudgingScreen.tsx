'use client'

import { useEffect, useState } from 'react'
import { GameConfig, JudgingResult, Player } from '../types'
import { supabase } from '../../lib/supabase'

interface JudgingScreenProps {
  config: GameConfig
  gameId: string
  players: Player[]
  onComplete: (result: JudgingResult) => void
}

const JUDGING_LINES = [
  'Analyzing creative use of color...',
  'Inspecting structural integrity...',
  'Evaluating adherence to the brief...',
  'Assessing detail and complexity...',
  'Deliberating with extreme prejudice...',
  'Calculating final scores...',
  'The AI has made its decision...',
]

function ScaleIcon({ className = 'w-8 h-8' }: { className?: string }) {
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

function AlertIcon({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </svg>
  )
}

export default function JudgingScreen({ config, gameId, players, onComplete }: JudgingScreenProps) {
  const [lineIndex, setLineIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex(prev => (prev + 1) % JUDGING_LINES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const judge = async () => {
      try {
        const res = await fetch('/api/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            players,
            challenge: config.challenge,
            buildType: config.buildType,
          }),
        })
        const data = await res.json()
        if (data.success) {
          await supabase.from('games').update({
            phase: 'results',
            judging_result: data.result,
          }).eq('id', gameId)
          setTimeout(() => onComplete(data.result), 1000)
        } else {
          setError('Judging failed. Please try again.')
        }
      } catch (e) {
        console.error(e)
        setError('Something went wrong. Check your API key and try again.')
      }
    }
    const delay = setTimeout(judge, 1500)
    return () => clearTimeout(delay)
  }, [config, gameId, players, onComplete])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#F8FAFC]">
        <div className="card p-8 max-w-md text-center">
          <AlertIcon className="w-10 h-10 text-[#DC2626] mx-auto mb-4" />
          <p className="text-[#64748B] mb-5">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2.5">
            Restart
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F8FAFC]">
      <div className="text-center max-w-sm w-full">

        {/* Spinner with icon */}
        <div className="w-20 h-20 mx-auto mb-8 relative">
          <svg className="w-full h-full animate-spin" style={{ animationDuration: '2.5s' }} viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#E2E8F0" strokeWidth="4" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="#1B3A6B"
              strokeWidth="4"
              strokeDasharray="60 154"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <ScaleIcon className="w-8 h-8 text-[#1B3A6B]" />
          </div>
        </div>

        <h2 className="font-display text-4xl font-bold text-[#0F172A] mb-2">
          The AI is <span className="text-[#1B3A6B]">Judging</span>
        </h2>
        <p className="text-sm text-[#64748B] mb-8">
          {players.filter(p => p.photoBase64).length} build{players.filter(p => p.photoBase64).length !== 1 ? 's' : ''} under review.
          There is no appealing this decision.
        </p>

        {/* Animated status line */}
        <div className="card p-4 min-h-[52px] flex items-center justify-center mb-8">
          <p key={lineIndex} className="text-sm text-[#475569] animate-[slideUp_0.4s_ease-out]">
            {JUDGING_LINES[lineIndex]}
          </p>
        </div>

        {/* Player thumbnails */}
        {players.filter(p => p.photoDataUrl).length > 0 && (
          <div className="flex gap-3 justify-center">
            {players.filter(p => p.photoDataUrl).map(p => (
              <div key={p.id} className="text-center">
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#E2E8F0] mb-1.5 shadow-sm">
                  <img src={p.photoDataUrl!} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-[#94A3B8] font-medium">{p.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
