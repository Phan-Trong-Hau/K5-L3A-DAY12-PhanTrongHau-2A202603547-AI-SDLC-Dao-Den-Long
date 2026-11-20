import { distanceXZ, point, spawnPoint, surfaces } from './maps.js'
import { dt } from './movement.js'

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

export function availableLantern(game, target, radius = 2) {
  return game.lanterns.filter(lantern => !lantern.lit && withinXZ(lantern, target, radius))
    .sort((a, b) => distanceXZ(a, target) - distanceXZ(b, target) || byId(a, b))[0]
}

function safeLantern(game, target, radius) {
  return game.lanterns.find(lantern => lantern.lit && distanceXZ(lantern, target) < radius - engineTolerance)
}

function shadePosition(game, shade, vector, amount, safeRadius, repelling = false) {
  const x = shade.x + vector.x * amount
  const z = shade.z + vector.z * amount
  const floor = surfaces(game.night, x, z).filter(surface => surface.y + 0.8 <= shade.y + 0.85).at(-1)
  if (!floor || (game.night === 3 && shade.y >= 6 && Math.hypot(x, z) < 2)) return false
  const blockedBy = repelling ? null : safeLantern(game, { x, z }, safeRadius)
  if (blockedBy) {
    if (safeLantern(game, shade, safeRadius)) return false
    // Stop at the circumference when a movement step crosses a lit lantern's boundary.
    let low = 0
    let high = amount
    for (let i = 0; i < 14; i++) {
      const middle = (low + high) / 2
      const target = { x: shade.x + vector.x * middle, z: shade.z + vector.z * middle }
      if (safeLantern(game, target, safeRadius)) high = middle
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
  if (!shadePosition(game, shade, force, force.distance, tuning.safe_radius)) force.ticks = 0
  else force.ticks--
}

export function applyPulse(game, tuning, emit) {
  const { player, simTick } = game
  if (player.carried < tuning.pulse_cost || player.pulseReady > simTick) return
  player.carried -= tuning.pulse_cost
  player.pulseReady = simTick + Math.round(tuning.pulse_cooldown_s * 60)
  const stunned_ids = []
  for (const shade of game.shades) {
    if (!withinPulse(player, shade, tuning.pulse_radius)) continue
    shade.state = 'stunned'
    shade.stateUntil = simTick + Math.round(tuning.pulse_stun_s * 60)
    forceShade(shade, player, 15, tuning.pulse_push_m)
    game.score += tuning.score.per_stun
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

export function moveShades(game, tuning) {
  const { player, simTick } = game
  for (const shade of game.shades) {
    const safe = safeLantern(game, shade, tuning.safe_radius)
    shade.repelling = Boolean(safe)
    if (safe) {
      const candidates = [direction(safe, shade), { x: 1, z: 0 }, { x: -1, z: 0 },
        { x: 0, z: 1 }, { x: 0, z: -1 }]
      const remaining = Math.max(1, 30 - (shade.repelTicks ?? 0))
      for (const vector of candidates) {
        const amount = (tuning.safe_radius - distanceXZ(safe, shade)) / remaining + engineTolerance
        if (shadePosition(game, shade, vector, amount, tuning.safe_radius, true)) break
      }
      shade.repelTicks = (shade.repelTicks ?? 0) + 1
    } else {
      shade.repelTicks = 0
    }

    if (shade.state === 'stunned' || shade.state === 'recoil' || shade.state === 'spawning') {
      if (simTick < shade.stateUntil) {
        if (!safe && shade.state !== 'spawning') advanceForce(game, shade, shade.push, tuning)
        continue
      }
      if (!safe && shade.state === 'recoil') advanceForce(game, shade, shade.push, tuning)
      const endingRecoil = shade.state === 'recoil'
      shade.state = 'wander'
      shade.push = null
      if (endingRecoil) continue
    }
    if (safe) continue

    if (shade.state === 'chase' && !withinXZ(shade, player, 18)) shade.state = 'wander'
    if (shade.state !== 'chase' && withinXZ(shade, player, 12)) shade.state = 'chase'
    const speed = game.night === 3 ? tuning.shade_speed_night3 : tuning.shade_speed
    if (shade.state === 'chase') {
      shadePosition(game, shade, direction(shade, player), Math.min(speed * dt, distanceXZ(shade, player)), tuning.safe_radius)
    } else {
      const angle = (simTick + shade.phase) * 0.012
      const moved = shadePosition(game, shade, { x: Math.cos(angle), z: Math.sin(angle) }, speed * dt, tuning.safe_radius)
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

  if (player.immuneUntil > simTick || safeLantern(game, player, tuning.safe_radius)) return
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
  return { id, ...position, phase: index * 97, state,
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
    !safeLantern(game, position, tuning.safe_radius))
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
