import contract from '../game.contract.json' with { type: 'json' }
import { maps, distanceXZ, point, spawnPoint, surfaces } from './maps.js'
import { movePlayer } from './movement.js'
import { applyPulse, fallOrRespawn, makeDrifter, makeShade, moveDrifters,
  moveShades, spawnActors, touched, withinXZ } from './actors.js'

import { availableLantern as chooseLantern, burnFuel, capacityOf, fuelOf, interactLantern, makeLantern,
  roundedFuel } from './lanterns.js'

export const tuning = contract.tuning
export { maps }
export const availableLantern = (game, target, radius) => chooseLantern(game, target, tuning, radius)
export const capacity = player => capacityOf(player, tuning)
const rounded = value => Number(value.toFixed(3))
const coords = ({ x, y, z }) => [x, y, z].map(rounded)
const samePoint = (a, b) => distanceXZ(a, b) < 0.000001 && Math.abs(a.y - b.y) < 0.000001

function randomGenerator(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function sortById(a, b) {
  return a.id.localeCompare(b.id, 'en', { numeric: true })
}

export function createGame(seed, scenario = {}, night = 1) {
  const map = maps[night]
  const random = randomGenerator(seed)
  const choose = items => {
    const index = Math.floor(random() * items.length)
    return [items[index], index]
  }
  const ids = {}
  const reserved = new Set([...(scenario.shades ?? []), ...(scenario.drifters ?? [])]
    .map(actor => actor.id).filter(Boolean))
  const nextId = prefix => {
    let id
    do {
      ids[prefix] = (ids[prefix] ?? 0) + 1
      id = prefix + ids[prefix]
    } while (reserved.has(id))
    return id
  }

  const player = scenario.player ?? {}
  const start = player.pos ? point(player.pos) : spawnPoint()
  const initialMotes = scenario.motes?.map(point) ?? []
  const randomMotes = scenario.random_motes !== false
  if (!scenario.motes && randomMotes) {
    const spots = [...map.motes]
    for (let index = 0; index < 20; index++) {
      const [spot, picked] = choose(spots)
      initialMotes.push(spot)
      spots.splice(picked, 1)
    }
  }

  return {
    night, map, random, choose, nextId,
    randomMotes,
    randomShades: scenario.random_shades !== false,
    randomDrifters: scenario.random_drifters !== false,
    tick: 0, simTick: 0,
    duration: scenario.time_left_s ?? tuning[`night${night}_duration_s`],
    state: 'playing',
    score: 0,
    sounds: [],
    wind: { active: false, dir_deg: 0, warning: false, enabled: night === 3 && scenario.wind_enabled !== false },
    player: {
      ...start, vx: 0, vy: 0, vz: 0,
      facingX: 0, facingZ: 1,
      grounded: surfaces(night, start.x, start.z).some(surface => Math.abs(surface.y - start.y) < 0.000001),
      carried: player.carried ?? 0,
      flames: player.flames ?? tuning.flames,
      successfulLights: player.successful_lights ?? 0,
      immuneUntil: player.invuln_ticks ?? 0, pulseReady: player.pulse_cd_ticks ?? 0,
      dashReady: player.dash_cd_ticks ?? 0, dashUntil: 0, charmUntil: player.charm_ticks ?? 0,
      respawnAt: 0,
    },
    lanterns: map.lanterns.map((layout, index) => {
      const id = `L${index + 1}`
      const override = scenario.lanterns?.find(lantern => lantern.id === id) ?? {}
      return makeLantern(id, layout, override, tuning)
    }),
    motes: initialMotes.map(position => ({ id: nextId('M'), ...position, kind: 'random', until: null, ready: 0 })),
    shades: (scenario.shades ?? []).map((shade, index) =>
      makeShade(shade.id ?? nextId('S'), point(shade.pos), index, shade)).sort(sortById),
    drifters: (scenario.drifters ?? []).map((drifter, index) =>
      makeDrifter(drifter.id ?? nextId('D'), drifter.pos, index, drifter)).sort(sortById),
    charms: (scenario.charms ?? map.charms.map(pos => ({ pos }))).map((charm, index) => ({
      id: charm.id ?? `C${index + 1}`,
      ...point(charm.pos ?? map.charms[Number(charm.id?.slice(1) ?? index + 1) - 1]),
      ready: charm.respawn_ticks ?? charm.respawn_ticks_left ?? Math.round((charm.respawn_s ?? 0) * 60),
      available: charm.available ?? !(charm.respawn_ticks || charm.respawn_ticks_left || charm.respawn_s),
    })).map(charm => ({ ...charm, ready: charm.available ? 0 : charm.ready || 2700 })),
  }
}

export function timeLeft(game) {
  return Math.max(0, game.duration - game.simTick / 60)
}

function updateWind(game) {
  const wind = game.wind
  if (!wind.enabled) return
  const phase = game.simTick % 1800
  if (phase === 1680) {
    wind.dir_deg = Math.floor(game.random() * 360)
    wind.warning = true
    game.sounds.push('wind')
  } else if (phase === 0) {
    wind.warning = false
    wind.active = true
  } else if (phase === 300) {
    wind.active = false
  }
}

function pickUp(game, emit) {
  const { player, simTick } = game
  const reachable = target => withinXZ(player, target, tuning.pickup_radius) &&
    Math.abs(player.y - target.y) <= 1.5 + 1e-7
  game.motes = game.motes.filter(mote => {
    if (player.carried >= capacity(player) || simTick < mote.ready || !reachable(mote)) return true
    player.carried++
    emit('mote_picked', { carried: player.carried })
    return false
  })
  for (const charm of game.charms) {
    if (!charm.available || !reachable(charm)) continue
    charm.available = false
    charm.ready = simTick + 2700
    player.charmUntil = simTick + 600
    emit('charm_picked', { charm_id: charm.id, charm_ticks: 600 })
  }
}

export function stepGame(game, input, sceneryCollision) {
  if (game.state === 'won' || game.state === 'lost') return []
  game.tick++
  game.sounds.length = 0
  const events = []
  const emit = (name, data) => events.push({ type: 'event', tick: game.tick, name, data })
  if (input.pause) {
    game.state = game.state === 'paused' ? 'playing' : 'paused'
    emit(game.state === 'paused' ? 'paused' : 'resumed', {})
  }
  if (game.state === 'paused') return events

  game.simTick++
  const { player, simTick } = game
  game.motes = game.motes.filter(mote => mote.until === null || mote.until > simTick)
  for (const charm of game.charms) {
    if (charm.ready <= simTick) charm.available = true
  }
  burnFuel(game, tuning, emit)
  updateWind(game)
  if (!player.respawnAt) movePlayer(game, input, tuning, emit, sceneryCollision)
  const falling = fallOrRespawn(game, tuning, emit)
  if (!falling) {
    pickUp(game, emit)
    if (input.interact) interactLantern(game, tuning, emit)
    if (input.pulse) applyPulse(game, tuning, emit)
  }
  moveShades(game, tuning)
  moveDrifters(game)
  if (!falling) touched(game, tuning, emit)

  if (game.randomMotes && simTick % 240 === 0 && game.motes.length < 30) {
    const free = game.map.motes.filter(point => !game.motes.some(mote => samePoint(mote, point)))
    if (free.length) {
      const [position] = game.choose(free)
      game.motes.push({ id: game.nextId('M'), ...position, kind: 'random', until: null, ready: simTick + 1 })
    }
  }
  spawnActors(game, tuning, emit)

  let reason
  if (player.flames <= 0) reason = 'no_flames'
  else if (timeLeft(game) <= 0) {
    const lit = game.lanterns.filter(lantern => lantern.lit)
    const won = lit.length >= Math.ceil(tuning.win_ratio * game.lanterns.length)
    reason = won ? 'dawn_survived' : 'dawn'
    if (won) game.score += player.flames * tuning.score.per_flame_left +
      lit.reduce((sum, lantern) => sum + tuning.score.per_dawn_lantern +
        Math.floor(fuelOf(lantern)) * tuning.score.per_dawn_fuel, 0)
  }
  if (reason) {
    game.state = reason === 'dawn_survived' ? 'won' : 'lost'
    emit('game_over', { result: game.state, reason })
  }
  return events
}

export function snapshot(game) {
  const remaining = until => Math.max(0, until - game.simTick) / 60
  const { player, wind } = game
  return {
    type: 'snapshot', tick: game.tick, sim_tick: game.simTick, state: game.state,
    time_left_s: timeLeft(game), score: game.score, night: game.night,
    wind: { active: wind.active, dir_deg: wind.dir_deg },
    player: {
      pos: coords(player), flames: player.flames, carried: player.carried, capacity: capacity(player),
      vel: [player.vx, player.vy, player.vz].map(rounded), grounded: player.grounded,
      invuln: player.immuneUntil > game.simTick, dash_cd_s: player.charmUntil > game.simTick ? 0 : remaining(player.dashReady),
      pulse_cd_s: remaining(player.pulseReady), charm_s: remaining(player.charmUntil),
    },
    lanterns: game.lanterns.map(lantern => ({ id: lantern.id, pos: coords(lantern), lit: lantern.lit, deposited: lantern.deposited,
      fuel: roundedFuel(lantern), ever_lit: lantern.everLit, relit_count: lantern.relitCount })),
    shades: game.shades.map(shade => ({ id: shade.id, pos: coords(shade), state: shade.state })),
    motes_active: game.motes.length,
    motes: game.motes.map(mote => ({ id: mote.id, pos: coords(mote), kind: mote.kind,
      ttl_s: mote.until === null ? null : remaining(mote.until) })),
    drifters: game.drifters.map(drifter => ({ id: drifter.id, pos: coords(drifter), state: drifter.state, stolen: drifter.stolen })),
    charms: game.charms.map(charm => ({ id: charm.id, available: charm.available, respawn_s: remaining(charm.ready) })),
  }
}
