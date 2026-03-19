'use client'

import { useState } from 'react'
import { GameConfig, BuildType, Player } from '../types'

interface SetupScreenProps {
  onStart: (config: GameConfig) => void
}

const CHALLENGE_PRESETS = {
  lego: ['Lighthouse', 'Rocket Ship', 'Castle', 'Robot', 'Dinosaur', 'Spaceship', 'Bridge', 'Car'],
  drawing: ['Self-portrait', 'Alien landscape', 'Dream house', 'Favorite animal', 'Penn State campus', 'Future city', 'Underwater scene'],
}

function BrickIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="16" height="9" rx="1.5" />
      <rect x="5" y="4" width="3.5" height="3" rx="0.75" />
      <rect x="11.5" y="4" width="3.5" height="3" rx="0.75" />
      <line x1="10" y1="7" x2="10" y2="16" strokeLinecap="round" />
    </svg>
  )
}

function PencilIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 3l4 4L7 17H3v-4L13 3z" strokeLinejoin="round" />
      <line x1="11" y1="5" x2="15" y2="9" />
    </svg>
  )
}

function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6v4l2.5 2.5" strokeLinecap="round" />
    </svg>
  )
}

function UsersIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="6" r="3" />
      <path d="M1 17a6 6 0 0112 0" strokeLinecap="round" />
      <circle cx="15" cy="6" r="2.5" />
      <path d="M13 17a4.5 4.5 0 016 0" strokeLinecap="round" />
    </svg>
  )
}

function PlusIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="3" x2="8" y2="13" strokeLinecap="round" />
      <line x1="3" y1="8" x2="13" y2="8" strokeLinecap="round" />
    </svg>
  )
}

function ArrowRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="10" x2="16" y2="10" strokeLinecap="round" />
      <polyline points="11 5 16 10 11 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [buildType, setBuildType] = useState<BuildType>('lego')
  const [challenge, setChallenge] = useState('')
  const [customChallenge, setCustomChallenge] = useState('')
  const [timerSeconds, setTimerSeconds] = useState(90)
  const [playerNames, setPlayerNames] = useState(['', '', '', ''])
  const [playerCount, setPlayerCount] = useState(3)

  const activePlayers = playerNames.slice(0, playerCount)
  const allNamed = activePlayers.every(n => n.trim().length > 0)
  const selectedChallenge = challenge === 'custom' ? customChallenge : challenge
  const canStart = allNamed && selectedChallenge.trim().length > 0

  const handleStart = () => {
    const players: Player[] = activePlayers.map((name, i) => ({
      id: `player-${i}`,
      name: name.trim(),
      photoDataUrl: null,
      photoBase64: null,
    }))
    onStart({ players, buildType, challenge: selectedChallenge.trim(), timerSeconds })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#F8FAFC]">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-[#1B3A6B] bg-[#EEF3FB] border border-[#C7D9F0] rounded-full mb-5">
            IST 130 · AI &amp; Art
          </div>
          <h1 className="font-display text-6xl md:text-7xl font-bold text-[#0F172A] tracking-tight leading-none mb-3">
            Quick<br /><span className="text-[#1B3A6B]">Build</span>
          </h1>
          <p className="text-[#64748B] text-sm">
            Race the clock. Build something. Let the AI judge your life choices.
          </p>
        </div>

        <div className="space-y-4">

          {/* Build Type */}
          <div className="card p-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
              <BrickIcon /> Build Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['lego', 'drawing'] as BuildType[]).map(type => (
                <button
                  key={type}
                  onClick={() => { setBuildType(type); setChallenge('') }}
                  className={`py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    buildType === type
                      ? 'bg-[#1B3A6B] text-white shadow-sm'
                      : 'btn-ghost'
                  }`}
                >
                  {type === 'lego'
                    ? <><BrickIcon /> LEGO Bricks</>
                    : <><PencilIcon /> Drawing</>
                  }
                </button>
              ))}
            </div>
          </div>

          {/* Challenge */}
          <div className="card p-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
              Challenge Prompt
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {CHALLENGE_PRESETS[buildType].map(preset => (
                <button
                  key={preset}
                  onClick={() => setChallenge(preset)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    challenge === preset
                      ? 'bg-[#1B3A6B] text-white'
                      : 'btn-ghost'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <button
                onClick={() => setChallenge('custom')}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-all ${
                  challenge === 'custom'
                    ? 'bg-[#1B3A6B] text-white'
                    : 'btn-ghost'
                }`}
              >
                <PlusIcon /> Custom
              </button>
            </div>
            {challenge === 'custom' && (
              <input
                type="text"
                placeholder="Enter your challenge..."
                value={customChallenge}
                onChange={e => setCustomChallenge(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#EEF3FB] transition-colors"
              />
            )}
          </div>

          {/* Timer */}
          <div className="card p-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
              <ClockIcon /> Timer
            </label>
            <div className="flex gap-2">
              {[60, 90, 120].map(t => (
                <button
                  key={t}
                  onClick={() => setTimerSeconds(t)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    timerSeconds === t ? 'bg-[#1B3A6B] text-white' : 'btn-ghost'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {/* Players */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                <UsersIcon /> Players
              </label>
              <div className="flex gap-1">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setPlayerCount(n)}
                    className={`w-8 h-8 text-sm rounded-lg transition-all font-medium ${
                      playerCount === n ? 'bg-[#1B3A6B] text-white' : 'btn-ghost'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: playerCount }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Player ${i + 1}`}
                  value={playerNames[i]}
                  onChange={e => {
                    const next = [...playerNames]
                    next[i] = e.target.value
                    setPlayerNames(next)
                  }}
                  className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#EEF3FB] transition-colors"
                />
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-4 text-base font-semibold btn-primary flex items-center justify-center gap-2 ${
              !canStart ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            Start Game <ArrowRightIcon />
          </button>

        </div>
      </div>
    </div>
  )
}
