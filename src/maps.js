const angle = degrees => degrees * Math.PI / 180
export const distanceXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
export const point = ([x, y, z]) => ({ x, y, z })
const ring = (count, radius, y = 0, start = 0, interval = 360 / count, center = 0) =>
  Array.from({ length: count }, (_, index) => {
    const theta = angle(start + interval * index)
    return { x: center + radius * Math.cos(theta), y, z: radius * Math.sin(theta) }
  })

const ramps = [30, 150].map(degrees => {
  const theta = angle(degrees)
  return { dx: Math.cos(theta), dz: Math.sin(theta) }
})

export const maps = {
  1: {
    name: 'Đảo Bến', radius: 40, centers: [0], shadeInterval: 480, shadeMax: 6,
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motes: [...ring(8, 12), ...ring(16, 33)],
    shades: ring(12, 37, 0, 15), pads: [], charms: [],
  },
  2: {
    name: 'Đảo Cau', radius: 28, centers: [0, 70], shadeInterval: 420, shadeMax: 8,
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motes: [0, 70].flatMap(center => [...ring(4, 10, 0, 0, 90, center), ...ring(8, 22, 0, 0, 45, center)]),
    shades: [0, 70].flatMap(center => ring(8, 26, 0, 22.5, 45, center)),
    pads: [{ x: 20, y: 0, z: 18, vy: 14, speed: 24, target: [70, 0] },
      { x: 50, y: 0, z: -18, vy: 14, speed: 24, target: [0, 0] }],
    charms: [[35, 0, 0]],
  },
  3: {
    name: 'Đảo Chuông', radius: 45, centers: [0], shadeInterval: 360, shadeMax: 10,
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motes: [...ring(18, 34), ...ring(8, 18, 3, 20, 20), ...ring(4, 5, 6, 45)],
    shades: ring(16, 43), pads: [{ x: 0, y: 3, z: 13, vy: 12, speed: 8, target: [0, 0] }],
    charms: [[30, 0, 25], [-30, 0, 25]], ramps,
  },
}

export function surfaces(night, x, z) {
  const { centers, radius } = maps[night]
  const centralRadius = Math.hypot(x, z)
  const levels = []
  if (centers.some(center => Math.hypot(x - center, z) <= radius) ||
      (night === 2 && x >= 26 && x <= 44 && Math.abs(z) <= 2)) levels.push({ y: 0 })
  if (night !== 3) return levels
  if (centralRadius <= 8) levels.push({ y: 6 })
  if (centralRadius >= 12 && centralRadius <= 24 && z > 0) levels.push({ y: 3 })
  for (const { dx, dz } of ramps) {
    const along = x * dx + z * dz
    if (along >= 23.6 && along <= 30 && Math.abs(-x * dz + z * dx) <= 1.5) {
      levels.push({ y: Math.min(3, (30 - along) / 2), ramp: true })
    }
  }
  return levels
}

export function spawnPoint() {
  return { x: 0, y: 0, z: 0 }
}
