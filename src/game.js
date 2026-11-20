import contract from '../game.contract.json' with { type: 'json' }
import { stepSeconds, movePlayer } from '../demo/phase0/simulation.js'
import { maps } from './maps.js'

export const tuning = contract.tuning
export { maps }
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const within = (a, b, radius) => distance(a, b) <= radius + 1e-9
const point = ([x, y, z]) => ({ x, y, z })
const coords = ({ x, y, z }) => [x, y, z].map(value => Number(value.toFixed(3)))

export function createGame(seed, scenario = {}) {
  let rng = seed >>> 0
  function random() {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0
    return rng / 4294967296
  }
  function position(min, max, y) {
    const angle = random() * 2 * Math.PI
    const radius = min + random() * (max - min)
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius]
  }

  const player = scenario.player ?? {}
  const motes = scenario.motes ?? (scenario.random_motes === false ? []
    : Array.from({ length: 30 }, () => position(3, 24, 0)))
  const shades = scenario.shades ?? (scenario.random_shades === false ? []
    : Array.from({ length: 3 }, () => ({ pos: position(15, 24, 0.85) })))
  const reserved = new Set(shades.map(shade => shade.id))
  let nextShade = 1
  return {
    tick: 0, simTick: 0, state: 'playing', score: 0, sounds: [],
    duration: scenario.time_left_s ?? tuning.night1_duration_s,
    wind: { active: false, warning: false },
    player: {
      ...point(player.pos ?? [0, 0, 0]), carried: player.carried ?? 0, flames: player.flames ?? tuning.flames,
      vy: 0, grounded: (player.pos?.[1] ?? 0) === 0, facingX: 0, facingZ: 1,
      immuneUntil: 0, pulseReady: 0,
    },
    lanterns: maps[1].lanterns.map((pos, index) => {
      const id = `L${index + 1}`
      const override = scenario.lanterns?.find(lantern => lantern.id === id) ?? {}
      const deposited = override.deposited ?? (override.lit ? tuning.lantern_cost : 0)
      return { id, ...point(override.pos ?? pos), deposited,
        lit: override.lit ?? (deposited >= tuning.lantern_cost) }
    }),
    motes: motes.map((pos, index) => ({ id: `M${index + 1}`, ...point(pos) })),
    shades: shades.map(shade => {
      while (reserved.has(`S${nextShade}`)) nextShade++
      return { id: shade.id ?? `S${nextShade++}`, ...point(shade.pos), state: 'chase', stunUntil: 0 }
    }),
  }
}

export const timeLeft = game => game.duration - game.tick / 60

export function availableLantern(game, target, radius = tuning.interact_radius) {
  return game.lanterns.filter(lantern => !lantern.lit && within(lantern, target, radius))
    .sort((a, b) => distance(a, target) - distance(b, target) || a.id.localeCompare(b.id))[0]
}

function inLight(game, position) {
  return game.lanterns.some(lantern => lantern.lit && within(lantern, position, tuning.safe_radius))
}

function stepPlayer(game, input) {
  const player = game.player
  if (input.x || input.z) {
    const length = Math.hypot(input.x, input.z)
    player.facingX = input.x / length
    player.facingZ = input.z / length
  }
  if (input.jump && player.grounded) {
    player.vy = 7.5
    game.sounds.push('jump')
  }
  movePlayer(player, input.x, input.z)
  player.vy -= 20 * stepSeconds
  player.y = Math.max(0, player.y + player.vy * stepSeconds)
  player.grounded = player.y === 0
  if (player.grounded) player.vy = 0
}

export function stepGame(game, input) {
  if (game.state !== 'playing') return []
  game.tick++
  game.simTick = game.tick
  game.sounds.length = 0
  const events = []
  const emit = (name, data) => events.push({ type: 'event', tick: game.tick, name, data })
  const { player } = game
  stepPlayer(game, input)

  game.motes = game.motes.filter(mote => {
    if (!within(mote, player, tuning.pickup_radius) || player.carried >= tuning.carry_capacity) return true
    player.carried++
    game.score += tuning.score.per_mote
    emit('mote_picked', { carried: player.carried })
    return false
  })

  if (input.interact && player.carried > 0) {
    const lantern = availableLantern(game, player)
    if (lantern) {
      const amount = Math.min(player.carried, tuning.lantern_cost - lantern.deposited)
      if (amount > 0) {
        player.carried -= amount
        lantern.deposited += amount
        emit('deposit', { lantern_id: lantern.id, amount, deposited: lantern.deposited })
      }
      if (lantern.deposited >= tuning.lantern_cost) {
        lantern.lit = true
        game.score += tuning.score.per_lantern
        emit('lantern_lit', { lantern_id: lantern.id })
      }
    }
  }

  if (input.pulse && player.carried >= tuning.pulse_cost && game.tick >= player.pulseReady) {
    player.carried -= tuning.pulse_cost
    player.pulseReady = game.tick + tuning.pulse_cooldown_s * 60
    const stunned_ids = []
    for (const shade of game.shades) {
      if (!within(shade, player, tuning.pulse_radius)) continue
      const range = distance(shade, player)
      const x = shade.x + (range > 0 ? (shade.x - player.x) / range : 1) * tuning.pulse_push_m
      const z = shade.z + (range > 0 ? (shade.z - player.z) / range : 0) * tuning.pulse_push_m
      if (!inLight(game, { x, z })) Object.assign(shade, { x, z })
      shade.state = 'stunned'
      shade.stunUntil = game.tick + tuning.pulse_stun_s * 60
      game.score += tuning.score.per_stun
      stunned_ids.push(shade.id)
    }
    emit('pulse', { stunned_ids })
  }

  for (const shade of game.shades) {
    if (game.tick < shade.stunUntil) continue
    shade.state = 'chase'
    const range = distance(shade, player)
    if (range > 0) {
      const factor = Math.min(1, tuning.shade_speed * stepSeconds / range)
      const next = { x: shade.x + (player.x - shade.x) * factor, z: shade.z + (player.z - shade.z) * factor }
      if (!inLight(game, next)) Object.assign(shade, next)
    }
    if (player.flames === 0 || game.tick < player.immuneUntil || inLight(game, player) ||
        !within(shade, player, tuning.shade_hit_radius)) continue
    player.flames--
    player.immuneUntil = game.tick + tuning.invuln_s * 60
    emit('player_hit', { by: 'shade', flames: player.flames, dropped: 0 })
  }

  const reason = player.flames === 0 ? 'no_flames'
    : game.lanterns.every(lantern => lantern.lit) ? 'all_lit' : timeLeft(game) <= 0 ? 'dawn' : null
  if (reason) {
    game.state = reason === 'all_lit' ? 'won' : 'lost'
    if (game.state === 'won') {
      game.score += Math.floor(Math.max(0, timeLeft(game))) * tuning.score.per_second_left +
        player.flames * tuning.score.per_flame_left
    }
    emit('game_over', { result: game.state, reason })
  }
  return events
}

export function snapshot(game) {
  return {
    type: 'snapshot', tick: game.tick, sim_tick: game.tick, state: game.state,
    time_left_s: timeLeft(game), score: game.score,
    player: { pos: coords(game.player), flames: game.player.flames, carried: game.player.carried },
    lanterns: game.lanterns.map(lantern => ({
      id: lantern.id, pos: coords(lantern), lit: lantern.lit, deposited: lantern.deposited,
    })),
    shades: game.shades.map(shade => ({ id: shade.id, pos: coords(shade), state: shade.state })),
    motes_active: game.motes.length,
    motes: game.motes.map(mote => ({ id: mote.id, pos: coords(mote) })),
  }
}
