export * from './types'
import type { GameConfig } from './types'

export type CaptureMode = 'upload' | 'camera'
export type CameraLayout = 'shared' | 'per-player'

export interface PlayerCameraAssignment {
  playerId: string
  deviceId: string
}

export interface GameConfigExtended extends GameConfig {
  captureMode: CaptureMode
  cameraLayout: CameraLayout
  cameraAssignments: PlayerCameraAssignment[]
}
