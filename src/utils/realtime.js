export const REALTIME_REFRESH_EVENT = 'rehanshi:realtime-refresh'
const REALTIME_STORAGE_KEY = 'rehanshi:realtime-refresh-payload'

export const broadcastRealtimeRefresh = (payload = {}) => {
  const eventPayload = {
    at: Date.now(),
    source: payload.source || 'app',
    targets: payload.targets || ['admin', 'customer', 'vendor'],
    ...payload,
  }

  window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT, { detail: eventPayload }))

  try {
    window.localStorage.setItem(REALTIME_STORAGE_KEY, JSON.stringify(eventPayload))
  } catch {
    // Storage can fail in private contexts; the same-tab event above still works.
  }
}

export const subscribeRealtimeRefresh = (callback) => {
  const handleEvent = (event) => callback(event.detail || {})
  const handleStorage = (event) => {
    if (event.key !== REALTIME_STORAGE_KEY || !event.newValue) return
    try {
      callback(JSON.parse(event.newValue))
    } catch {
      callback({})
    }
  }

  window.addEventListener(REALTIME_REFRESH_EVENT, handleEvent)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(REALTIME_REFRESH_EVENT, handleEvent)
    window.removeEventListener('storage', handleStorage)
  }
}

export const shouldHandleRealtimeTarget = (payload, target) => {
  if (!target) return true
  const targets = payload?.targets || []
  return targets.includes('all') || targets.includes(target)
}

export const playRealtimeSound = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  const audioContext = new AudioContext()
  const playTone = (frequency, startTime, duration) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, startTime)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  const now = audioContext.currentTime
  playTone(760, now, 0.14)
  playTone(1040, now + 0.16, 0.18)
}
