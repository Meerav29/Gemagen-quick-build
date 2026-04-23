export * from './types'
import type { GameConfig } from './types'
import type { PersonaId } from './lib/personas'

export type { PersonaId }
export type CaptureMode = 'upload' | 'camera' | 'phone'
export type CameraLayout = 'shared' | 'per-player'

export interface PlayerCameraAssignment {
  playerId: string
  deviceId: string
}

export interface GameConfigExtended extends GameConfig {
  captureMode: CaptureMode
  cameraLayout: CameraLayout
  cameraAssignments: PlayerCameraAssignment[]
  personaId: PersonaId
}
