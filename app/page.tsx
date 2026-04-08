'use client'

import { useState } from 'react'
import { GamePhase, JudgingResult, Player } from './types'
import { GameConfigExtended } from './types-extended'
import SetupScreen from './components/SetupScreen'
import PlayingScreen from './components/PlayingScreen'
import JudgingScreen from './components/JudgingScreen'
import ResultsScreen from './components/ResultsScreen'

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [config, setConfig] = useState<GameConfigExtended | null>(null)
  const [gameId, setGameId] = useState<string | null>(null)
  const [finalPlayers, setFinalPlayers] = useState<Player[]>([])
  const [judgingResult, setJudgingResult] = useState<JudgingResult | null>(null)

  const handleStart = async (cfg: GameConfigExtended) => {
    setConfig(cfg)

    // Create game in Supabase
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: cfg.challenge,
        buildType: cfg.buildType,
        timerSeconds: cfg.timerSeconds,
        players: cfg.players.map((p, i) => ({ id: p.id, name: p.name, playerNumber: i + 1 })),
      }),
    })
    const { gameId: newGameId } = await res.json()
    setGameId(newGameId)

    // Store gameId so AudienceView can pick up the latest game
    try { localStorage.setItem('quickbuild_game_id', newGameId) } catch {}

    setPhase('playing')
  }

  const handleTimeUp = (players: Player[]) => {
    setFinalPlayers(players)
    setPhase('judging')
  }

  const handleJudgingComplete = (result: JudgingResult) => {
    setJudgingResult(result)
    setPhase('results')
  }

  const handlePlayAgain = () => {
    setPhase('setup')
    setConfig(null)
    setGameId(null)
    setFinalPlayers([])
    setJudgingResult(null)
  }

  return (
    <main className="relative">
      {phase === 'setup' && <SetupScreen onStart={handleStart} />}
      {phase === 'playing' && config && gameId && (
        <PlayingScreen config={config} gameId={gameId} onTimeUp={handleTimeUp} />
      )}
      {phase === 'judging' && config && gameId && (
        <JudgingScreen config={config} gameId={gameId} players={finalPlayers} onComplete={handleJudgingComplete} />
      )}
      {phase === 'results' && config && judgingResult && (
        <ResultsScreen config={config} players={finalPlayers} result={judgingResult} onPlayAgain={handlePlayAgain} />
      )}
    </main>
  )
}
