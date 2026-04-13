export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
}

export function createPhonePeerConnection(
  localStream: MediaStream,
  onIceCandidate: (candidate: RTCIceCandidate) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIG)
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate)
  }
  return pc
}

export function createHostPeerConnection(
  onTrack: (stream: MediaStream) => void,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onStateChange: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIG)
  pc.ontrack = (event) => {
    if (event.streams[0]) onTrack(event.streams[0])
  }
  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate)
  }
  pc.onconnectionstatechange = () => onStateChange(pc.connectionState)
  return pc
}

export function captureFrameFromVideo(video: HTMLVideoElement): string | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return dataUrl.split(',')[1]
}
