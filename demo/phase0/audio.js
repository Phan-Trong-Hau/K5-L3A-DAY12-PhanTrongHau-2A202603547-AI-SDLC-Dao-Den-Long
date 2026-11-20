const motifs = {
  mote_picked: [660, 880], lantern_lit: [392, 523, 659, 784],
  refuel: [523, 659], lantern_out: [180, 131],
  pulse: [660, 483, 260], player_hit: [180, 105], jump: [310, 460],
  won: [392, 523, 659, 784, 1047], lost: [330, 262, 175],
  shade_spawned: [143, 209], countdown: [660], charm_picked: [523, 659, 932],
  drifter_steal: [480, 360], wind: [180, 270, 360],
}

export function createAudio() {
  let context
  let volume = 0.55
  let nextNote = 0
  let note = 0
  let master
  const background = [130.81, 164.81, 196, 164.81, 146.83, 174.61, 220, 174.61]

  function tone(frequency, at, duration, gain, type, endFrequency = frequency) {
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, at)
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration)
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.linearRampToValueAtTime(gain, at + 0.026)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    oscillator.connect(envelope).connect(master)
    oscillator.start(at)
    oscillator.stop(at + duration)
  }

  return {
    enable() {
      if (!context) {
        const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext
        if (!Audio) return
        context = new Audio()
        master = context.createGain()
        master.gain.value = volume
        master.connect(context.destination)
      }
      if (context.state === 'suspended') context.resume().catch(() => {})
    },
    volume(value) {
      volume = value
      if (master) master.gain.setTargetAtTime(value, context.currentTime, 0.025)
    },
    play(name) {
      if (!context) return
      if (name === 'dash') {
        tone(104, context.currentTime, 0.25, 0.09, 'sawtooth', 45)
        return
      }
      if (!motifs[name]) return
      for (const [index, frequency] of motifs[name].entries()) {
        tone(frequency, context.currentTime + index * 0.085, 0.23, 0.12, 'triangle')
      }
    },
    ambient() {
      if (!context || context.currentTime < nextNote) return
      nextNote = context.currentTime + 0.82
      tone(background[note++ % background.length], context.currentTime, 1.25, 0.06, 'sine')
    },
  }
}
