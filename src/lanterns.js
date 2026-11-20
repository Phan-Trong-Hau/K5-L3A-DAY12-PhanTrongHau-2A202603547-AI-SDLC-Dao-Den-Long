import { distanceXZ, point } from './maps.js'
import { rate } from './movement.js'

const epsilon = 1e-7
export const fuelOf = lantern => lantern.fuelTicks / rate
export const roundedFuel = lantern => Number(fuelOf(lantern).toFixed(1))
export const lowFuel = (lantern, tuning) => lantern.lit && lantern.fuelTicks < tuning.low_fuel_threshold * rate
export const capacityOf = (player, tuning) => Math.min(tuning.capacity_max,
  tuning.carry_capacity + 2 * player.successfulLights)
export const lightCost = (lantern, tuning) => lantern.everLit ? tuning.relight_cost : tuning.lantern_cost

export function makeLantern(id, layout, override, tuning) {
  const lit = override.lit ?? ((override.deposited ?? 0) >=
    (override.ever_lit ? tuning.relight_cost : tuning.lantern_cost))
  return {
    id, ...point(override.pos ?? layout), lit, everLit: override.ever_lit ?? lit, relitCount: 0,
    deposited: override.deposited ?? (lit ? tuning.lantern_cost : 0),
    fuelTicks: lit ? Math.round((override.fuel ?? tuning.fuel_max) * rate) : 0,
  }
}

export function nearestLantern(game, target, accept, radius = Infinity) {
  let nearest
  let distance = radius + epsilon
  // The map creates lamps in ID order, so an exact tie retains the lower ID.
  for (const lantern of game.lanterns) {
    if (!accept(lantern)) continue
    const range = distanceXZ(lantern, target)
    if (range > distance || (nearest && range === distance)) continue
    distance = range
    nearest = lantern
  }
  return nearest
}

export function availableLantern(game, target, tuning, radius = tuning.interact_radius) {
  return nearestLantern(game, target, lantern => lantern.lit
    ? lantern.fuelTicks < tuning.fuel_max * rate
    : lantern.deposited < lightCost(lantern, tuning), radius)
}

export function safeLantern(game, target, tuning) {
  return game.lanterns.find(lantern => lantern.lit && !lowFuel(lantern, tuning) &&
    distanceXZ(lantern, target) < tuning.safe_radius - epsilon)
}

export function burnFuel(game, tuning, emit) {
  const draining = new Map()
  for (const shade of game.shades) {
    if (shade.state !== 'drain') continue
    const lantern = game.lanterns.find(lamp => lamp.id === shade.lanternId)
    if (!lantern || !lowFuel(lantern, tuning) || distanceXZ(shade, lantern) > 2 + epsilon) continue
    shade.drainTicks++
    if (!draining.has(lantern)) draining.set(lantern, [])
    draining.get(lantern).push(shade)
  }
  for (const lantern of game.lanterns) {
    if (!lantern.lit) continue
    const shades = draining.get(lantern) ?? []
    lantern.fuelTicks = Math.max(0, lantern.fuelTicks - tuning.fuel_decay_per_s - shades.length * tuning.drain_per_s)
    for (const shade of shades) {
      if (shade.drainTicks % rate === 0) {
        emit('fuel_drain', { lantern_id: lantern.id, shade_id: shade.id, fuel: roundedFuel(lantern) })
      }
    }
    if (lantern.fuelTicks > 0) continue
    lantern.lit = false
    lantern.everLit = true
    lantern.deposited = 0
    emit('lantern_out', { lantern_id: lantern.id })
  }
}

export function interactLantern(game, tuning, emit) {
  const { player } = game
  if (!player.carried) return
  const lantern = availableLantern(game, player, tuning)
  if (!lantern) return
  if (lantern.lit) {
    const maxFuel = tuning.fuel_max * rate
    const perMote = tuning.fuel_per_mote * rate
    const amount = Math.min(player.carried, Math.ceil((maxFuel - lantern.fuelTicks) / perMote))
    lantern.fuelTicks = Math.min(maxFuel, lantern.fuelTicks + amount * perMote)
    player.carried -= amount
    game.score += amount * tuning.score.per_deposit
    emit('refuel', { lantern_id: lantern.id, amount, fuel: roundedFuel(lantern) })
    return
  }

  const cost = lightCost(lantern, tuning)
  const amount = Math.min(player.carried, cost - lantern.deposited)
  player.carried -= amount
  lantern.deposited += amount
  game.score += amount * tuning.score.per_deposit
  emit('deposit', { lantern_id: lantern.id, amount, deposited: lantern.deposited })
  if (lantern.deposited < cost) return

  const relight = lantern.everLit
  lantern.lit = true
  lantern.everLit = true
  lantern.fuelTicks = tuning.fuel_max * rate
  lantern.relitCount += Number(relight)
  player.successfulLights++
  game.score += relight ? tuning.score.per_relight : tuning.score.per_lantern
  emit('lantern_lit', { lantern_id: lantern.id, relight })
}
