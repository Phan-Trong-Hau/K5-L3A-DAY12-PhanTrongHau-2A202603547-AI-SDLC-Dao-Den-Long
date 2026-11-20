import * as THREE from 'three'
import { surfaces } from '../../src/maps.js'

export function addGrass(scenery, night, map, skip, cutSurface) {
  const positions = []
  const colors = []
  const base = new THREE.Color('#36634f')
  const tip = new THREE.Color('#79a679')

  function blade(x, z, width, height, lean) {
    positions.push(x - width, 0, z, x + width, 0, z, x + lean, height, z + 0.10)
    colors.push(...base.toArray(), ...base.toArray(), ...tip.toArray())
  }
  blade(-0.16, 0.04, 0.037, 0.30, -0.09)
  blade(-0.04, -0.05, 0.043, 0.39, 0.045)
  blade(0.08, 0.11, 0.039, 0.31, 0.13)
  blade(0.18, -0.07, 0.036, 0.26, 0.10)
  blade(0.02, 0.04, 0.030, 0.22, -0.12)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: '#294533', emissiveIntensity: 0.45 })
  cutSurface(material)
  const tuft = new THREE.Object3D()
  const tint = new THREE.Color()
  const attempts = 1900
  let seed = 82731 + night
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (const center of map.centers) {
    const grass = new THREE.InstancedMesh(geometry, material, attempts)
    grass.name = 'scenery-grass'
    let count = 0
    for (let index = 0; index < attempts; index++) {
      const angle = random() * Math.PI * 2
      const range = (map.radius - 0.7) * Math.sqrt(random())
      const x = center + Math.cos(angle) * range
      const z = Math.sin(angle) * range
      if (range < 3.4 || skip(x, z)) continue
      const levels = surfaces(night, x, z)
      if (levels.some(level => level.ramp)) continue
      const y = Math.max(...levels.map(level => level.y))
      if (!Number.isFinite(y) || (y === 6 && Math.hypot(x, z) < 2.7)) continue
      const tone = 0.76 + random() * 0.24
      tint.setRGB(tone, tone, tone)
      tuft.position.set(x, y + 0.008, z)
      tuft.rotation.y = random() * Math.PI * 2
      tuft.scale.set(0.76 + random() * 0.76, 0.44 + random() * 0.52, 0.76 + random() * 0.76)
      tuft.updateMatrix()
      grass.setMatrixAt(count, tuft.matrix)
      grass.setColorAt(count++, tint)
    }
    grass.count = count
    scenery.add(grass)
  }
}
