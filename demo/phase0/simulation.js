import contract from '../../game.contract.json' with { type: 'json' }

export const tickRate = 60
export const stepSeconds = 1 / tickRate
export const playerSpeed = contract.tuning.player_speed
export const islandRadius = 30

export function movePlayer(position, x, z, radius = islandRadius) {
  if (x === 0 && z === 0) return
  const inputLength = Math.max(1, Math.hypot(x, z))
  const distancePerStep = playerSpeed * stepSeconds / inputLength
  const nextX = position.x + x * distancePerStep
  const nextZ = position.z + z * distancePerStep
  const edgeScale = Math.max(1, Math.hypot(nextX, nextZ) / (radius - 1))
  position.x = nextX / edgeScale
  position.z = nextZ / edgeScale
}
