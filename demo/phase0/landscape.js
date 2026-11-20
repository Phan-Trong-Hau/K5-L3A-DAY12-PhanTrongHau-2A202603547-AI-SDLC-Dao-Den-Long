import * as THREE from 'three'
import { addStream, addWildlife, streamCenter, waterImmersion } from './wildlife.js'
import { createTerrainDent, stompRadius } from './terrain-dent.js'
import { createSceneryCollision } from './scenery-collision.js'
import { addGrass } from './grass.js'
import { maps, surfaces } from '../../src/maps.js'

const grass = '#2F5D50'
const lawn = '#336356'
const sand = '#C9B48A'
const wood = '#6B4A2F'
const treeColors = ['#516c78', '#74577a', '#496d5d']
const habitatsByNight = {
  1: [{ x: 0, z: 0, radius: 39, scale: 1, angle: 0 }],
  2: [
    { x: 0, z: 0, radius: 24, scale: 1, angle: 0 },
    { x: 70, z: 0, radius: 24, scale: 1, angle: Math.PI },
  ],
  3: [{ x: -22, z: -17, radius: 23, scale: 0.72, angle: 0 }],
}

function inHabitat(habitat, x, z) {
  const dx = (x - habitat.x) / habitat.scale
  const dz = (z - habitat.z) / habitat.scale
  return { x: dx * habitat.cosine - dz * habitat.sine, z: dx * habitat.sine + dz * habitat.cosine }
}

function nearStream(habitat, x, z) {
  const local = inHabitat(habitat, x, z)
  return Math.abs(local.z) < habitat.radius - 1 && Math.abs(local.x - streamCenter(local.z)) < 3
}

export function createLandscape(scene, night, { benchmark = false } = {}) {
  const scenery = new THREE.Group()
  const terrain = new THREE.Group()
  scenery.add(terrain)
  scene.add(scenery)
  const map = maps[night]
  const solidProps = []
  const dent = benchmark ? null : createTerrainDent(scenery, grass, lawn)
  let seed = 7124 + night
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const materials = new Map()
  function mesh(root, geometry, color, x, y, z, emissive = 0x000000) {
    const key = `${color}:${emissive}`
    if (!materials.has(key)) {
      const material = new THREE.MeshLambertMaterial({ color, emissive })
      if ([grass, lawn, sand, wood].includes(color)) dent?.cutSurface(material)
      materials.set(key, material)
    }
    const view = new THREE.Mesh(geometry, materials.get(key))
    view.position.set(x, y, z)
    root.add(view)
    return view
  }

  function island(center) {
    mesh(scenery, new THREE.CylinderGeometry(map.radius, map.radius - 7, 6, 80), wood, center, -3.04, 0)
    mesh(terrain, new THREE.CylinderGeometry(map.radius, map.radius, 0.08, 128), grass, center, -0.04, 0)
    mesh(scenery, new THREE.CylinderGeometry(5, 5, 0.025, 40), benchmark ? sand : lawn, center, -0.006, 0)
  }
  map.centers.forEach(island)
  mesh(scenery, new THREE.CylinderGeometry(225, 225, 1, 64), '#12384A', 0, -13, 0)
  if (night === 2) {
    mesh(terrain, new THREE.BoxGeometry(18, 0.17, 4), wood, 35, -0.085, 0)
    const board = new THREE.BoxGeometry(0.11, 0.012, 4)
    for (let index = 0; index < 28; index++) mesh(scenery, board, sand, 26.4 + index * 0.64, 0.013, 0)
  }
  if (night === 3) {
    const upper = new THREE.CylinderGeometry(8, 8, 3, 80)
    mesh(terrain, upper, grass, 0, 4.5, 0)
    const shape = new THREE.Shape()
    shape.absarc(0, 0, 24, 0, Math.PI, false)
    shape.lineTo(-12, 0)
    shape.absarc(0, 0, 12, Math.PI, 0, true)
    shape.closePath()
    const tiers = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 48 })
    tiers.rotateX(Math.PI / 2)
    // The extrusion runs down from the top at y=3.
    mesh(terrain, tiers, grass, 0, 3, 0)
    for (const { dx, dz } of map.ramps) {
      const positions = [
        30 * dx + 1.5 * dz, 0, 30 * dz - 1.5 * dx,
        30 * dx - 1.5 * dz, 0, 30 * dz + 1.5 * dx,
        24 * dx + 1.5 * dz, 3, 24 * dz - 1.5 * dx,
        24 * dx - 1.5 * dz, 3, 24 * dz + 1.5 * dx,
      ]
      const ramp = new THREE.BufferGeometry()
      ramp.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      ramp.setIndex([0, 2, 1, 1, 2, 3])
      ramp.computeVertexNormals()
      mesh(terrain, ramp, sand, 0, 0, 0)
    }
    mesh(scenery, new THREE.CylinderGeometry(2, 2, 8, 28), wood, 0, 10, 0)
    mesh(scenery, new THREE.CylinderGeometry(2, 2, 0.7, 28), '#F2C14E', 0, 13.7, 0)
  }
  for (const pad of map.pads) {
    mesh(scenery, new THREE.CylinderGeometry(1, 1, 0.05, 28), '#8FA3B8', pad.x, pad.y, pad.z, '#285379')
    mesh(scenery, new THREE.CylinderGeometry(0.55, 0.55, 0.055, 24), '#F2C14E', pad.x, pad.y, pad.z, '#945821')
  }

  const habitats = (benchmark ? [] : habitatsByNight[night]).map((habitat, index) => {
    const group = new THREE.Group()
    group.name = `wildlife-habitat-${index + 1}`
    group.position.set(habitat.x, 0, habitat.z)
    group.rotation.y = habitat.angle
    group.scale.setScalar(habitat.scale)
    scenery.add(group)
    return {
      ...habitat, group, cosine: Math.cos(habitat.angle), sine: Math.sin(habitat.angle),
      stream: addStream(group, habitat.radius), wildlife: addWildlife(group, night, habitat.radius),
    }
  })

  const nearMapFeature = (x, z) =>
    (night === 2 && x > 24 && x < 46 && Math.abs(z) < 3) ||
    map.lanterns.some(([lx, , lz]) => Math.hypot(x - lx, z - lz) < 3.5) ||
    map.pads.some(pad => Math.hypot(x - pad.x, z - pad.z) < 3)

  const stoneGeometry = new THREE.DodecahedronGeometry(1)
  const stoneMaterial = new THREE.MeshLambertMaterial({ color: '#fff' })
  const stones = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, map.centers.length * 42)
  stones.name = 'scenery-stones'
  const stone = new THREE.Object3D()
  const stoneColors = ['#8997a0', '#666b85', '#aea18b'].map(color => new THREE.Color(color))
  let stoneCount = 0
  for (const center of map.centers) {
    for (let index = 0; !benchmark && index < 42; index++) {
      const radius = 6 + (map.radius - 7) * Math.sqrt(random())
      const theta = index * 2.39996
      const x = center + Math.cos(theta) * radius
      const z = Math.sin(theta) * radius
      const levels = surfaces(night, x, z)
      if (levels.some(level => level.ramp) || nearMapFeature(x, z) ||
          habitats.some(habitat => nearStream(habitat, x, z))) continue
      const size = 0.18 + random() * 0.45
      const base = Math.max(...levels.map(level => level.y))
      stone.position.set(x, base + size * 0.17, z)
      solidProps.push({ x, z, base, radius: size * 0.86, top: base + size * 0.56, canStand: true })
      stone.rotation.set(0, random() * Math.PI, 0)
      stone.scale.set(size, size * 0.45, size * 0.8)
      stone.updateMatrix()
      stones.setMatrixAt(stoneCount, stone.matrix)
      stones.setColorAt(stoneCount++, stoneColors[index % stoneColors.length])
    }
  }
  stones.count = stoneCount
  scenery.add(stones)

  const jewel = new THREE.IcosahedronGeometry(1, 0)
  const cone = new THREE.ConeGeometry(1, 1, 8)
  const trunk = new THREE.CylinderGeometry(0.19, 0.35, 1, 7)
  const trees = []
  for (const center of map.centers) {
    for (let index = 0; index < 36; index++) {
      const radius = 7 + (map.radius - 10) * Math.sqrt(random())
      const theta = index * 2.39996
      const x = center + Math.cos(theta) * radius
      const z = Math.sin(theta) * radius
      if (habitats.some(habitat => nearStream(habitat, x, z)) ||
          (night === 3 && radius < 31 && z > 0) ||
          nearMapFeature(x, z) ||
          trees.some(tree => Math.hypot(x - tree.root.position.x, z - tree.root.position.z) < 3)) continue
      const height = 3 + random() * 4
      const root = new THREE.Group()
      const foliage = new THREE.Group()
      root.add(foliage)
      root.position.set(x, 0, z)
      scenery.add(root)
      trees.push({ root, foliage, height })
      if (!benchmark) solidProps.push({ x, z, base: 0, radius: 0.34, top: height })
      mesh(foliage, trunk, wood, 0, height / 2, 0).scale.y = height
      const type = index % 3
      if (type === 0) {
        for (let layer = 0; layer < 3; layer++) {
          mesh(foliage, cone, treeColors[type], 0, height * 0.60 + layer * height * 0.23, 0)
            .scale.set(1.8 - layer * 0.34, height * 0.44, 1.8 - layer * 0.34)
        }
      } else {
        mesh(foliage, jewel, treeColors[type], 0, height, 0).scale.set(1.7, 1.3, 1.7)
        for (let leaf = 0; leaf < 4; leaf++) {
          const angle = leaf * Math.PI / 2
          const crown = mesh(foliage, jewel, treeColors[type], Math.cos(angle) * 1.25,
            height - (type === 1 ? 0.32 : 0.9), Math.sin(angle) * 1.25)
          crown.scale.set(0.9, type === 1 ? 0.82 : 1.48, 0.9)
        }
      }
    }
  }

  const treeBatches = new Map()
  for (const tree of trees) {
    tree.root.updateMatrixWorld(true)
    tree.instances = []
    for (const part of tree.foliage.children) {
      const key = part.geometry.id + ':' + part.material.id
      let batch = treeBatches.get(key)
      if (!batch) {
        batch = { geometry: part.geometry, material: part.material, transforms: [] }
        treeBatches.set(key, batch)
      }
      tree.instances.push({ batch, index: batch.transforms.length })
      batch.transforms.push(part.matrixWorld.clone())
    }
    tree.root.removeFromParent()
  }
  for (const batch of treeBatches.values()) {
    batch.mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.transforms.length)
    batch.transforms.forEach((matrix, index) => batch.mesh.setMatrixAt(index, matrix))
    batch.mesh.frustumCulled = false
    scenery.add(batch.mesh)
  }
  if (!benchmark) {
    addGrass(scenery, night, map, (x, z) =>
      nearMapFeature(x, z) ||
      habitats.some(habitat => nearStream(habitat, x, z)) ||
      solidProps.some(prop => Math.hypot(x - prop.x, z - prop.z) < prop.radius + 0.1),
    material => dent.cutSurface(material, 0.41))
  }
  const hideTree = new THREE.Matrix4().makeScale(0, 0, 0)

  const leafMaterial = new THREE.MeshBasicMaterial({ color: '#b7b286', side: THREE.DoubleSide })
  const leafMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.23, 0.12), leafMaterial, 32)
  scenery.add(leafMesh)
  leafMesh.frustumCulled = false
  const leaf = new THREE.Object3D()
  const animalPosition = new THREE.Vector3()
  return {
    terrain,
    nearbyAnimal(player, reach) {
      let nearest
      let range = reach
      for (const habitat of habitats) {
        if (!habitat.group.visible) continue
        for (const animal of habitat.wildlife.animals) {
          if (animal.away) continue
          habitat.group.localToWorld(animalPosition.copy(animal.root.position))
          const distance = Math.hypot(animalPosition.x - player.x, animalPosition.z - player.z)
          if (distance >= range || Math.abs(animalPosition.y - player.y) > 1.25) continue
          nearest = animal
          range = distance
        }
      }
      return nearest
    },
    collision: benchmark ? undefined : createSceneryCollision(solidProps),
    strikeGround({ x, y, z, grounded }, tick, reducedMotion) {
      if (!dent || !grounded || this.immersionAt({ x, y, z, grounded }) > 0) return
      const center = map.centers.find(cx => Math.hypot(x - cx, z) < map.radius - 1.1)
      if (center === undefined || !surfaces(night, x, z).some(surface => !surface.ramp && surface.y === y)) return
      let size = Math.min(stompRadius, map.radius - Math.hypot(x - center, z) - 0.03)
      if (night === 3) {
        const radial = Math.hypot(x, z)
        if (y === 3) size = Math.min(size, radial - 12, 24 - radial, z)
        if (y === 6) size = Math.min(size, 8 - radial, radial - 2)
      }
      if (size < 1.1) return
      dent.start(x, y, z, center, size, tick, reducedMotion)
    },
    updateDent(tick) {
      dent?.update(tick)
    },
    immersionAt({ x, y, z, grounded }) {
      if (!grounded || Math.abs(y) > 0.15) return 0
      return Math.max(0, ...habitats.map(habitat => {
        const local = inHabitat(habitat, x, z)
        return waterImmersion(local.x, local.z, habitat.radius)
      }))
    },
    animate(seconds, camera, player, wind) {
      for (const habitat of habitats) {
        habitat.group.visible = Math.hypot(camera.position.x - habitat.x, camera.position.z - habitat.z) < 68
        if (!habitat.group.visible) continue
        habitat.stream(seconds)
        habitat.wildlife.animate(seconds)
      }
      const dx = camera.position.x - player.x
      const dz = camera.position.z - player.z
      for (const tree of trees) {
        const x = tree.root.position.x - player.x
        const z = tree.root.position.z - player.z
        const along = (x * dx + z * dz) / (dx * dx + dz * dz)
        const occluded = along > -0.05 && along < 1.05 &&
          Math.hypot(x - dx * along, z - dz * along) < 2.3 &&
          player.y + 1 + (camera.position.y - player.y - 1) * along < tree.height + 1.2
        if (tree.occluded === occluded) continue
        tree.occluded = occluded
        for (const { batch, index } of tree.instances) {
          batch.mesh.setMatrixAt(index, occluded ? hideTree : batch.transforms[index])
          batch.mesh.instanceMatrix.needsUpdate = true
        }
      }
      leafMesh.visible = wind.active || wind.warning
      if (!leafMesh.visible) return
      const windAngle = wind.dir_deg * Math.PI / 180
      for (let index = 0; index < leafMesh.count; index++) {
        const along = (seconds * 5 + index * 3.31) % 20 - 10
        const across = Math.sin(index * 8.8) * 9
        leaf.position.set(player.x + Math.cos(windAngle) * along - Math.sin(windAngle) * across,
          player.y + 0.5 + index % 7 * 0.32,
          player.z + Math.sin(windAngle) * along + Math.cos(windAngle) * across)
        leaf.rotation.set(seconds + index, seconds * 1.8 + index, 0.4)
        leaf.updateMatrix()
        leafMesh.setMatrixAt(index, leaf.matrix)
      }
      leafMesh.instanceMatrix.needsUpdate = true
    },
    dispose() {
      const geometries = new Set()
      const used = new Set()
      scenery.traverse(object => {
        if (object.geometry) geometries.add(object.geometry)
        if (object.material) used.add(object.material)
      })
      geometries.forEach(geometry => geometry.dispose())
      used.forEach(material => material.dispose())
      scenery.removeFromParent()
    },
  }
}
