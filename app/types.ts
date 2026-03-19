export type BuildType = 'lego' | 'drawing'

export interface Player {
  id: string
  name: string
  photoDataUrl: string | null
  photoBase64: string | null
}

export interface CommentaryEntry {
  id: string
  playerName: string
  text: string
  timestamp: number
}

export interface PlayerScore {
  playerName: string
  playerNumber: number
  score: number
  scoringReasoning: string
  colorScore: number
  structureScore: number
  adherenceScore: number
  detailScore: number
}

export interface JudgingResult {
  scores: Record<string, PlayerScore>
  overallWinner: {
    playerName: string
    playerNumber: number
    winnerReasoning: string
  }
  winnerAnnouncementScript: string
}

export type GamePhase = 'setup' | 'playing' | 'judging' | 'results'

export interface GameConfig {
  players: Player[]
  buildType: BuildType
  challenge: string
  timerSeconds: number
}
