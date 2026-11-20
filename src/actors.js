import { distanceXZ, point, spawnPoint, surfaces } from './maps.js'
import { dt } from './movement.js'
import { lowFuel, nearestLantern, safeLantern } from './lanterns.js'

const engineTolerance = 1e-7
const byId = (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })
export const withinXZ = (a, b, range) => distanceXZ(a, b) <= range + engineTolerance
const withinPulse = (player, target, range) => Math.hypot(player.x - target.x, player.y + 0.8 - target.y,
  player.z - target.z) <= range + engineTolerance

function direction(from, to, fallback = 1) {
  const range = distanceXZ(from, to)
  return range > engineTolerance ? { x: (to.x - from.x) / range, z: (to.z - from.z) / range } : { x: fallback, z: 0 }
}

function move(actor, vector, amount) {
  actor.x += vector.x * amount
  actor.z += vector.z * amount
}

function shadeCanOccupy(game, shade, x, z) {
  if (game.night === 3 && shade.y >= 6 && Math.hypot(x, z) < 2) return false
  return surfaces(game.night, x, z).some(surface => surface.y <= shade.y + 0.05)
}

function shadePosition(game, shade, vector, amount, tuning) {
  const x = shade.x + vector.x * amount
  const z = shade.z + vector.z * amount
  if (!shadeCanOccupy(game, shade, x, z)) return false
  const blockedBy = safeLantern(game, { x, z }, tuning)
  if (blockedBy) {
    if (safeLantern(game, shade, tuning)) return false
    // Stop at the circumference when a movement step crosses a lit lantern's boundary.
    let low = 0
    let high = amount
    for (let i = 0; i < 14; i++) {
      const middle = (low + high) / 2
      const target = { x: shade.x + vector.x * middle, z: shade.z + vector.z * middle }
      if (safeLantern(game, target, tuning)) high = middle
      else low = middle
    }
    move(shade, vector, low)
    return false
  }
  shade.x = x
  shade.z = z
  return true
}

function forceShade(shade, player, ticks, travel) {
  shade.push = { ...direction(player, shade), ticks, distance: travel / ticks }
}

function advanceForce(game, shade, force, tuning) {
  if (!force?.ticks) return
  if (!shadePosition(game, shade, force, force.distance, tuning)) force.ticks = 0
  else force.ticks--
}

export function stunShade(shade, until) {
  shade.state = 'stunned'
  shade.lanternId = undefined
  shade.drainTicks = 0
  shade.stateUntil = until
  shade.push = null
}

export function applyPulse(game, tuning, emit) {
  const { player, simTick } = game
  if (player.carried < tuning.pulse_cost || player.pulseReady > simTick) return
  player.carried -= tuning.pulse_cost
  player.pulseReady = simTick + Math.round(tuning.pulse_cooldown_s * 60)
  const stunned_ids = []
  for (const shade of game.shades) {
    if (!withinPulse(player, shade, tuning.pulse_radius)) continue
    const draining = shade.state === 'drain'
    stunShade(shade, simTick + Math.round(tuning.pulse_stun_s * 60))
    forceShade(shade, player, 15, tuning.pulse_push_m)
    game.score += draining ? tuning.score.per_drain_stun : tuning.score.per_stun
    stunned_ids.push(shade.id)
  }
  emit('pulse', { stunned_ids })
  for (const drifter of game.drifters) {
    if (!withinPulse(player, drifter, tuning.pulse_radius)) continue
    if (drifter.state === 'chase') startFlee(game, drifter, 240)
    else if (drifter.state === 'flee' && drifter.stolen > 0) {
      const amount = drifter.stolen
      drifter.stolen = 0
      drifter.stateUntil = game.simTick + 120
      dropMotes(game, drifter, amount, 0)
      emit('drifter_drop', { drifter_id: drifter.id, amount })
    }
  }
}

function exitTarget(game, shade, tuning) {
  let best
  let distance = Infinity
  const active = game.lanterns.filter(lantern => lantern.lit && !lowFuel(lantern, tuning))
  for (const lantern of active) {
    const heading = Math.atan2(shade.z - lantern.z, shade.x - lantern.x)
    for (let index = 0; index < 120; index++) {
      const angle = heading + Math.PI * index / 60
      const radius = tuning.safe_radius + engineTolerance
      const target = { x: lantern.x + Math.cos(angle) * radius, z: lantern.z + Math.sin(angle) * radius }
      const range = distanceXZ(shade, target)
      if (range >= distance || safeLantern(game, target, tuning) ||
          !shadeCanOccupy(game, shade, target.x, target.z)) continue
      let clear = true
      for (let progress = 1; progress < 30 && clear; progress++) {
        const ratio = progress / 30
        clear = shadeCanOccupy(game, shade, shade.x + (target.x - shade.x) * ratio,
          shade.z + (target.z - shade.z) * ratio)
      }
      if (clear) {
        best = target
        distance = range
      }
    }
  }
  return best
}

function repelShade(game, shade, tuning) {
  if (!shade.exit || safeLantern(game, shade.exit, tuning)) {
    shade.exit = exitTarget(game, shade, tuning)
    shade.exitAt ??= game.simTick + 29
  }
  if (!shade.exit) return
  const remaining = Math.max(1, shade.exitAt - game.simTick + 1)
  shade.x += (shade.exit.x - shade.x) / remaining
  shade.z += (shade.exit.z - shade.z) / remaining
}

function leaveDrain(shade, state) {
  shade.state = state
  shade.lanternId = undefined
  shade.drainTicks = 0
}

export function moveShades(game, tuning) {
  const { player, simTick } = game
  for (const shade of game.shades) {
    let stoppedDraining = false
    if (shade.state === 'drain') {
      const target = game.lanterns.find(lantern => lantern.id === shade.lanternId)
      stoppedDraining = !target || !lowFuel(target, tuning) || !withinXZ(shade, target, 2)
      if (stoppedDraining) leaveDrain(shade, 'wander')
      else if (withinXZ(shade, player, 6)) leaveDrain(shade, 'chase')
    }

    shade.repelling = Boolean(safeLantern(game, shade, tuning))
    if (shade.repelling) repelShade(game, shade, tuning)
    else {
      shade.exit = undefined
      shade.exitAt = undefined
    }

    if (shade.state === 'stunned' || shade.state === 'recoil' || shade.state === 'spawning') {
      if (simTick < shade.stateUntil) {
        if (!shade.repelling && shade.state !== 'spawning') advanceForce(game, shade, shade.push, tuning)
        continue
      }
      if (!shade.repelling && shade.state === 'recoil') advanceForce(game, shade, shade.push, tuning)
      const endingInWander = shade.state !== 'spawning'
      shade.state = 'wander'
      shade.push = null
      if (endingInWander) continue
    }
    if (shade.repelling || stoppedDraining || shade.state === 'drain') continue

    if (shade.state === 'chase' && !withinXZ(shade, player, 18)) shade.state = 'wander'
    else if (!game.benchmark && shade.state === 'wander' && withinXZ(shade, player, 12)) shade.state = 'chase'

    const speed = game.night === 3 ? tuning.shade_speed_night3 : tuning.shade_speed
    if (shade.state === 'chase') {
      shadePosition(game, shade, direction(shade, player), Math.min(speed * dt, distanceXZ(shade, player)), tuning)
      continue
    }

    const weak = nearestLantern(game, shade, lantern => lowFuel(lantern, tuning))
    const target = weak ?? nearestLantern(game, shade, lantern => !lantern.lit)
    if (target) {
      const range = distanceXZ(shade, target)
      if (!weak || !withinXZ(shade, target, 2)) {
        shadePosition(game, shade, direction(shade, target), Math.min(speed * dt, range), tuning)
      }
      if (weak && withinXZ(shade, target, 2)) {
        shade.state = 'drain'
        shade.lanternId = target.id
        shade.drainTicks = 0
      }
    } else {
      const angle = (simTick + shade.phase) * 0.012
      const moved = shadePosition(game, shade, { x: Math.cos(angle), z: Math.sin(angle) }, speed * dt, tuning)
      if (!moved) shade.phase += 60
    }
  }
}

function startFlee(game, drifter, duration) {
  drifter.state = 'flee'
  drifter.stateUntil = game.simTick + duration
  drifter.flee = direction(game.player, drifter)
}

export function moveDrifters(game) {
  const { player, simTick } = game
  for (const drifter of game.drifters) {
    if (drifter.state === 'flee') {
      if (simTick >= drifter.stateUntil) drifter.state = 'removed'
      else move(drifter, drifter.flee, 7 * dt)
      continue
    }
    if (drifter.state === 'removed') continue
    drifter.state = player.carried >= 5 && withinXZ(drifter, player, 15) ? 'chase' : 'idle'
    if (drifter.state === 'chase') move(drifter, direction(drifter, player), Math.min(7 * dt, distanceXZ(drifter, player)))
    else {
      const angle = (simTick + drifter.phase) * 0.017
      move(drifter, { x: Math.cos(angle), z: Math.sin(angle) }, 2 * dt)
    }
  }
  game.drifters = game.drifters.filter(drifter => drifter.state !== 'removed')
}

function dropMotes(game, center, amount, minRadius = 1.5) {
  if (amount === 0) return
  const first = game.random() * 2 * Math.PI
  for (let index = 0; index < amount; index++) {
    const radius = minRadius ? minRadius + game.random() : 0
    const angle = first + index * 2 * Math.PI / amount
    const x = center.x + Math.cos(angle) * radius
    const z = center.z + Math.sin(angle) * radius
    const level = surfaces(game.night, x, z).filter(surface => surface.y <= center.y + 0.1).at(-1)
    game.motes.push({
      id: game.nextId('M'), x, y: level?.y ?? center.y, z, kind: 'dropped',
      until: game.simTick + 480, ready: game.simTick + 1,
    })
  }
}

export function touched(game, tuning, emit) {
  const { player, simTick } = game
  if (player.respawnAt || player.flames <= 0) return
  for (const drifter of game.drifters) {
    if (drifter.state !== 'chase' || !withinXZ(drifter, player, 1.2)) continue
    const amount = Math.min(3, player.carried)
    if (!amount) continue
    player.carried -= amount
    drifter.stolen = amount
    startFlee(game, drifter, 240)
    emit('drifter_steal', { drifter_id: drifter.id, amount, carried: player.carried })
  }

  if (player.immuneUntil > simTick || safeLantern(game, player, tuning)) return
  const shade = game.shades.find(candidate =>
    ['chase', 'wander'].includes(candidate.state) && !candidate.repelling &&
    withinXZ(candidate, player, tuning.shade_hit_radius) && Math.abs(candidate.y - player.y) <= 1.5)
  if (!shade) return
  player.flames--
  const dropped = Math.floor(player.carried * tuning.hit_drop_ratio)
  player.carried -= dropped
  player.immuneUntil = simTick + Math.round(tuning.invuln_s * 60)
  dropMotes(game, player, dropped)
  shade.state = 'recoil'
  shade.stateUntil = simTick + 60
  forceShade(shade, player, 60, 2)
  emit('player_hit', { by: 'shade', flames: player.flames, dropped })
}

export function fallOrRespawn(game, tuning, emit) {
  const { player, simTick } = game
  if (player.respawnAt) {
    if (simTick < player.respawnAt) return true
    Object.assign(player, spawnPoint(), {
      vx: 0, vy: 0, vz: 0, grounded: true, respawnAt: 0,
      immuneUntil: simTick + Math.round(tuning.invuln_s * 60),
    })
    return true
  }
  if (player.y >= -10) return false
  const lost = player.carried
  player.carried = 0
  player.flames--
  player.respawnAt = simTick + 60
  player.launch = null
  player.lastPad = null
  player.dashUntil = 0
  player.vx = player.vy = player.vz = 0
  player.grounded = false
  emit('player_hit', { by: 'fall', flames: player.flames, dropped: 0, lost })
  return true
}

export function makeShade(id, position, index, fields = {}, simTick = 0) {
  const state = fields.state ?? 'wander'
  return { id, ...position, phase: index * 97, state, lanternId: fields.target_lantern_id, drainTicks: 0,
    stateUntil: simTick + (fields.state_ticks_left ?? (state === 'spawning' ? 1 : 0)) }
}

export function makeDrifter(id, coords, index, fields = {}) {
  const position = point(coords)
  return { id, ...position, phase: index * 71, state: fields.state ?? 'idle',
    stolen: fields.stolen ?? 0, stateUntil: fields.state_ticks_left ?? 240,
    flee: { x: 1, z: 0 } }
}

export function spawnActors(game, tuning, emit) {
  const { simTick, map, player } = game
  const eligible = () => map.shades.filter(position => distanceXZ(position, player) >= 15 &&
    !game.shades.some(shade => withinXZ(position, shade, 1)) &&
    !safeLantern(game, position, tuning))
  if (game.randomShades && simTick >= 300 && (simTick - 300) % map.shadeInterval === 0) {
    const count = simTick === 300 ? 2 : 1
    for (let index = 0; index < count && game.shades.length < map.shadeMax; index++) {
      const spots = eligible()
      if (!spots.length) break
      const [position] = game.choose(spots)
      const shade = makeShade(game.nextId('S'), { ...position, y: position.y + 0.8 },
        game.shades.length, { state: 'spawning' }, simTick)
      game.shades.push(shade)
      emit('shade_spawned', { id: shade.id })
    }
    game.shades.sort(byId)
  }

  if (game.randomDrifters && game.night > 1 && simTick % 1200 === 0 && game.drifters.length < 2) {
    const [position] = game.choose(map.shades)
    game.drifters.push(makeDrifter(game.nextId('D'), [position.x, position.y + 0.8, position.z], game.drifters.length))
  }
}
