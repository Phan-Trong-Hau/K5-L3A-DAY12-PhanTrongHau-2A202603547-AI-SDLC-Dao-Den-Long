const bodyRadius = 0.40
const bodyHeight = 0.95
const margin = 0.0001

export function createSceneryCollision(objects) {
  return {
    slide(player, targetX, targetZ) {
      let { x, z } = player
      let dx = targetX - x
      let dz = targetZ - z
      for (let pass = 0; pass < 3; pass++) {
        const length = dx * dx + dz * dz
        if (length < margin * margin) break
        let obstacle
        let contact = 1
        for (const prop of objects) {
          if (player.y >= prop.top - margin || player.y + bodyHeight <= prop.base) continue
          const ox = x - prop.x
          const oz = z - prop.z
          const approach = ox * dx + oz * dz
          if (approach >= 0) continue
          const radius = bodyRadius + prop.radius
          const gap = ox * ox + oz * oz - radius * radius
          const discriminant = approach * approach - length * gap
          if (discriminant < 0) continue
          const time = gap <= 0 ? 0 : (-approach - Math.sqrt(discriminant)) / length
          if (time >= contact) continue
          contact = time
          obstacle = prop
        }
        if (!obstacle) return { x: x + dx, z: z + dz }

        const stop = Math.max(0, contact - margin / Math.sqrt(length))
        x += dx * stop
        z += dz * stop
        dx *= 1 - stop
        dz *= 1 - stop
        const normalLength = Math.hypot(x - obstacle.x, z - obstacle.z)
        if (normalLength < margin) break
        const nx = (x - obstacle.x) / normalLength
        const nz = (z - obstacle.z) / normalLength
        const inward = Math.min(0, dx * nx + dz * nz)
        dx -= inward * nx
        dz -= inward * nz
      }
      return { x, z }
    },

    floorsAt(x, z) {
      return objects.filter(prop => prop.canStand && Math.hypot(x - prop.x, z - prop.z) <= prop.radius)
        .map(prop => ({ y: prop.top }))
    },
  }
}
