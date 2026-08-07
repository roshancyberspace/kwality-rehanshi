export const playOrderAlertSound = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  const audioContext = new AudioContext()
  const playTone = (frequency, startTime, duration) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, startTime)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  const now = audioContext.currentTime
  playTone(880, now, 0.16)
  playTone(1175, now + 0.18, 0.2)
}
