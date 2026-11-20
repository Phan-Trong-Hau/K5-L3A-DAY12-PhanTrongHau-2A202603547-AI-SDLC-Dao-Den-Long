import { distanceXZ, surfaces } from './maps.js'

export const rate = 60
export const dt = 1 / rate
const tolerance = 0.000001

function onFloor(night, player) {
  return surfaces(night, player.x, player.z).some(surface => Math.abs(surface.y - player.y) < tolerance)
}

export function movePlayer(game, input, tuning, emit) {
  const { player, night, map, simTick } = game
  const inputLength = Math.hypot(input.x, input.z)
  if (inputLength > 0) {
    player.facingX = input.x / inputLength
    player.facingZ = input.z / inputLength
  }

  const wasGrounded = player.grounded
  if (wasGrounded && input.jump) {
    player.vy = 7
    player.grounded = false
    game.sounds.push('jump')
  }

  if (input.dash && simTick >= player.dashUntil && (simTick >= player.dashReady || player.charmUntil > simTick)) {
    player.dashUntil = simTick + Math.round(tuning.dash_duration_s * rate)
    player.dashReady = simTick + Math.round(tuning.dash_cooldown_s * rate)
    player.dashX = player.facingX
    player.dashZ = player.facingZ
    player.frozenDash = !player.grounded
    emit('dash', {})
  }

  const dashing = simTick < player.dashUntil
  if (dashing) {
    player.vx = player.dashX * tuning.dash_speed
    player.vz = player.dashZ * tuning.dash_speed
  } else if (player.launch) {
    player.vx = player.launch.x
    player.vz = player.launch.z
  } else {
    const speed = (player.charmUntil > simTick ? 7.2 : tuning.player_speed) / Math.max(1, inputLength)
    player.vx = input.x * speed
    player.vz = input.z * speed
  }

  if (game.wind.active) {
    const angle = game.wind.dir_deg * Math.PI / 180
    player.vx += 2 * Math.cos(angle)
    player.vz += 2 * Math.sin(angle)
  }

  const previousY = player.y
  const nextX = player.x + player.vx * dt
  const nextZ = player.z + player.vz * dt
  const levels = surfaces(night, nextX, nextZ)
  const previousLevels = surfaces(night, player.x, player.z)
  const risingRamp = player.grounded && levels.some(level => level.ramp && Math.abs(level.y - previousY) <= 0.25)
  const tower = night === 3 && previousY >= 6 && previousY < 14 &&
    Math.hypot(nextX, nextZ) < 2 && Math.hypot(nextX, nextZ) < Math.hypot(player.x, player.z)
  const wall = levels.some(level => level.y > previousY + tolerance &&
    !(level.ramp && risingRamp) && !(risingRamp && level.y <= previousY + 0.25) &&
    !previousLevels.some(previous => !previous.ramp && previous.y === level.y))
  if (tower || wall) {
    player.vx = 0
    player.vz = 0
  } else {
    player.x = nextX
    player.z = nextZ
  }

  const currentLevels = tower || wall ? previousLevels : levels
  const ramp = player.grounded
    ? currentLevels.find(level => level.ramp && Math.abs(level.y - previousY) <= 0.25)
    : null
  if (ramp) {
    player.y = ramp.y
    player.vy = 0
  } else if (!(dashing && player.frozenDash)) {
    if (!player.grounded || !onFloor(night, player)) {
      player.vy -= 20 * dt
      player.y += player.vy * dt
      const floor = currentLevels
        .filter(level => level.y <= previousY + tolerance && level.y >= player.y - tolerance)
        .sort((a, b) => b.y - a.y)[0]
      if (player.vy <= 0 && floor) {
        player.y = floor.y
        player.vy = 0
      }
    }
  }

  player.grounded = onFloor(night, player) && player.vy <= 0
  if (!player.grounded) return
  player.launch = null
  const pad = map.pads.find(candidate => Math.abs(candidate.y - player.y) < tolerance &&
    distanceXZ(candidate, player) <= 1)
  if (!pad || (pad === player.lastPad && wasGrounded)) {
    player.lastPad = pad ?? null
    return
  }
  const dx = pad.target[0] - pad.x
  const dz = pad.target[1] - pad.z
  const distance = Math.hypot(dx, dz)
  player.vy = pad.vy
  player.launch = { x: pad.speed * dx / distance, z: pad.speed * dz / distance }
  player.vx = player.launch.x
  player.vz = player.launch.z
  player.grounded = false
  player.lastPad = pad
  game.sounds.push('jump')
}
