'use client'

import { useState, useEffect } from 'react'
import { BuildType, Player } from '../types'
import { CaptureMode, CameraLayout, GameConfigExtended } from '../types-extended'

interface SetupScreenProps {
  onStart: (config: GameConfigExtended) => void
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

function CameraIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 7.5A1.5 1.5 0 013.5 6h.879a1.5 1.5 0 001.06-.44l.622-.621A1.5 1.5 0 017.12 4.5h5.758a1.5 1.5 0 011.06.44l.622.62A1.5 1.5 0 0015.62 6h.879A1.5 1.5 0 0118 7.5v7A1.5 1.5 0 0116.5 16h-13A1.5 1.5 0 012 14.5v-7z" strokeLinejoin="round" />
      <circle cx="10" cy="11" r="2.5" />
    </svg>
  )
}

function UploadIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13V4m0 0L7 7m3-3l3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" strokeLinecap="round" />
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

  // Capture mode state
  const [captureMode, setCaptureMode] = useState<CaptureMode>('upload')
  const [cameraLayout, setCameraLayout] = useState<CameraLayout>('shared')
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [cameraAssignments, setCameraAssignments] = useState<Record<number, string>>({})
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [camerasLoading, setCamerasLoading] = useState(false)

  // Enumerate cameras when mode switches to camera
  useEffect(() => {
    if (captureMode !== 'camera') return

    // Check API availability (requires HTTPS in production)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setCameraError('Camera mode requires a secure connection (HTTPS).')
      return
    }

    let tempStream: MediaStream | null = null

    const enumerate = async () => {
      setCamerasLoading(true)
      setCameraError(null)
      try {
        // Request brief permission so labels are populated
        tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(d => d.kind === 'videoinput')
        if (cameras.length === 0) {
          setCameraError('No cameras detected. Connect a camera and try again.')
        } else {
          setAvailableCameras(cameras)
        }
      } catch (err: unknown) {
        const domErr = err as DOMException
        if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
          setCameraError('Camera permission denied. Allow camera access and try again.')
        } else {
          setCameraError('Could not access cameras. Check your browser settings.')
        }
      } finally {
        // Stop the temporary permission stream immediately
        tempStream?.getTracks().forEach(t => t.stop())
        setCamerasLoading(false)
      }
    }

    enumerate()
  }, [captureMode])

  const handleCaptureModeChange = (mode: CaptureMode) => {
    setCaptureMode(mode)
    setCameraError(null)
    setCameraAssignments({})
    if (mode === 'upload') setAvailableCameras([])
  }

  const handlePlayerCountChange = (n: number) => {
    setPlayerCount(n)
    setCameraAssignments(prev => {
      const next: Record<number, string> = {}
      for (let i = 0; i < n; i++) {
        if (prev[i]) next[i] = prev[i]
      }
      return next
    })
  }

  const activePlayers = playerNames.slice(0, playerCount)
  const allNamed = activePlayers.every(n => n.trim().length > 0)
  const selectedChallenge = challenge === 'custom' ? customChallenge : challenge

  // In shared mode: just need at least one camera detected.
  // In per-player mode: every player slot must have a camera selected, no duplicates.
  const allCamerasAssigned = captureMode === 'upload'
    || cameraLayout === 'shared'
      ? availableCameras.length > 0
      : (activePlayers.every((_, i) => !!cameraAssignments[i]) && availableCameras.length > 0)

  const hasDuplicateCameras = captureMode === 'camera' && cameraLayout === 'per-player' && (() => {
    const assigned = activePlayers.map((_, i) => cameraAssignments[i]).filter(Boolean)
    return assigned.length !== new Set(assigned).size
  })()

  const canStart = allNamed && selectedChallenge.trim().length > 0 && allCamerasAssigned && !hasDuplicateCameras && !cameraError

  const handleStart = () => {
    const players: Player[] = activePlayers.map((name, i) => ({
      id: `player-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      photoDataUrl: null,
      photoBase64: null,
    }))

    let cameraAssignmentsList: { playerId: string; deviceId: string }[] = []
    if (captureMode === 'camera') {
      if (cameraLayout === 'shared') {
        // All players share the first/only camera
        const sharedDeviceId = availableCameras[0]?.deviceId ?? ''
        cameraAssignmentsList = players.map(p => ({ playerId: p.id, deviceId: sharedDeviceId }))
      } else {
        cameraAssignmentsList = players.map((p, i) => ({ playerId: p.id, deviceId: cameraAssignments[i] }))
      }
    }

    onStart({
      players,
      buildType,
      challenge: selectedChallenge.trim(),
      timerSeconds,
      captureMode,
      cameraLayout,
      cameraAssignments: cameraAssignmentsList,
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center px-6 py-8 sm:py-12 bg-[#F8FAFC]">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-[#1B3A6B] bg-[#EEF3FB] border border-[#C7D9F0] rounded-full mb-5">
            IST 130 · AI &amp; Art
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold text-[#0F172A] tracking-tight leading-none mb-3">
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

          {/* Capture Mode */}
          <div className="card p-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
              <CameraIcon /> Capture Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleCaptureModeChange('upload')}
                className={`py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  captureMode === 'upload' ? 'bg-[#1B3A6B] text-white shadow-sm' : 'btn-ghost'
                }`}
              >
                <UploadIcon /> Player Upload
              </button>
              <button
                onClick={() => handleCaptureModeChange('camera')}
                className={`py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  captureMode === 'camera' ? 'bg-[#1B3A6B] text-white shadow-sm' : 'btn-ghost'
                }`}
              >
                <CameraIcon /> Live Camera
              </button>
            </div>

            {captureMode === 'camera' && camerasLoading && (
              <p className="mt-3 text-xs text-[#64748B]">Detecting cameras…</p>
            )}

            {captureMode === 'camera' && cameraError && (
              <div className="mt-3 flex items-start gap-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495z" strokeLinejoin="round" />
                  <line x1="10" y1="8" x2="10" y2="11" strokeLinecap="round" />
                  <circle cx="10" cy="14" r="0.5" fill="currentColor" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-[#92400E]">{cameraError}</p>
                  <button
                    onClick={() => handleCaptureModeChange('upload')}
                    className="text-xs text-[#1B3A6B] underline mt-1"
                  >
                    Switch to Player Upload
                  </button>
                </div>
              </div>
            )}

            {captureMode === 'camera' && !cameraError && !camerasLoading && availableCameras.length > 0 && (
              <div className="mt-3 space-y-3">
                {/* Shared vs per-player sub-toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setCameraLayout('shared'); setCameraAssignments({}) }}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      cameraLayout === 'shared' ? 'bg-[#1B3A6B] text-white' : 'btn-ghost'
                    }`}
                  >
                    One shared camera
                  </button>
                  <button
                    onClick={() => setCameraLayout('per-player')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      cameraLayout === 'per-player' ? 'bg-[#1B3A6B] text-white' : 'btn-ghost'
                    }`}
                  >
                    One per player
                  </button>
                </div>

                {cameraLayout === 'shared' && (
                  <p className="text-xs text-[#64748B]">
                    {availableCameras.length} camera{availableCameras.length !== 1 ? 's' : ''} detected. All players will share the same view.
                  </p>
                )}

                {cameraLayout === 'per-player' && (
                  <div className="space-y-2">
                    {activePlayers.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#64748B] w-20 truncate">{name || `Player ${i + 1}`}</span>
                        <select
                          value={cameraAssignments[i] ?? ''}
                          onChange={e => setCameraAssignments(prev => ({ ...prev, [i]: e.target.value }))}
                          className={`flex-1 bg-white border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1B3A6B] transition-colors ${
                            hasDuplicateCameras && cameraAssignments[i] &&
                            Object.entries(cameraAssignments).some(([k, v]) => Number(k) !== i && v === cameraAssignments[i])
                              ? 'border-[#DC2626] text-[#DC2626]'
                              : 'border-[#E2E8F0] text-[#0F172A]'
                          }`}
                        >
                          <option value="">Select camera…</option>
                          {availableCameras.map((cam, ci) => (
                            <option key={cam.deviceId} value={cam.deviceId}>
                              {cam.label || `Camera ${ci + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {hasDuplicateCameras && (
                      <p className="text-xs text-[#DC2626]">Each player must have a different camera.</p>
                    )}
                  </div>
                )}
              </div>
            )}
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
                    onClick={() => handlePlayerCountChange(n)}
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
