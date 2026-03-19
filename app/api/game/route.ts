import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

// Generate a 6-char game ID — no ambiguous chars (0/O, 1/I/L)
function generateGameId(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const { challenge, buildType, timerSeconds, players } = await req.json()

    const gameId = generateGameId()

    const { error: gameError } = await supabase.from('games').insert({
      id: gameId,
      challenge,
      build_type: buildType,
      timer_seconds: timerSeconds,
      phase: 'waiting',
    })

    if (gameError) throw gameError

    const playerRows = players.map((p: { id: string; name: string; playerNumber: number }) => ({
      id: p.id,
      game_id: gameId,
      name: p.name,
      player_number: p.playerNumber,
    }))

    const { error: playersError } = await supabase.from('players').insert(playerRows)
    if (playersError) throw playersError

    return NextResponse.json({ gameId })
  } catch (err) {
    console.error('Game creation error:', err)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { gameId, ...updates } = await req.json()
    const { error } = await supabase.from('games').update(updates).eq('id', gameId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Game update error:', err)
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }
}
