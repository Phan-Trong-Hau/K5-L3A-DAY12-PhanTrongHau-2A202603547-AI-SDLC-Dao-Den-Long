import * as THREE from 'three'
import { addStream, addWildlife, streamCenter } from './wildlife.js'
import { maps } from '../../src/maps.js'

const grass = '#2F5D50'
const sand = '#C9B48A'
const wood = '#6B4A2F'
const treeColors = ['#516c78', '#74577a', '#496d5d']

export function createLandscape(scene, night) {
  const scenery = new THREE.Group()
  const terrain = new THREE.Group()
  scenery.add(terrain)
  scene.add(scenery)
  const map = maps[night]
  let seed = 7124 + night
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const materials = new Map()
  function mesh(root, geometry, color, x, y, z, emissive = 0x000000) {
    const key = `${color}:${emissive}`
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshLambertMaterial({ color, emissive }))
    }
    const view = new THREE.Mesh(geometry, materials.get(key))
    view.position.set(x, y, z)
    root.add(view)
    return view
  }

  function island(center) {
    mesh(scenery, new THREE.CylinderGeometry(map.radius, map.radius - 7, 6, 80), wood, center, -3.04, 0)
    mesh(terrain, new THREE.CylinderGeometry(map.radius, map.radius, 0.08, 128), grass, center, -0.04, 0)
    mesh(scenery, new THREE.CylinderGeometry(5, 5, 0.025, 40), sand, center, -0.006, 0)
  }
  map.centers.forEach(island)
  mesh(scenery, new THREE.CylinderGeometry(225, 225, 1, 64), '#12384A', 0, -13, 0)
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
      if ((night === 1 && Math.abs(x - streamCenter(z)) < 3) ||
          map.lanterns.some(([lx, , lz]) => Math.hypot(x - lx, z - lz) < 4) ||
          trees.some(tree => Math.hypot(x - tree.root.position.x, z - tree.root.position.z) < 3)) continue
      const height = 3 + random() * 4
      const root = new THREE.Group()
      const foliage = new THREE.Group()
      root.add(foliage)
      root.position.set(x, 0, z)
      scenery.add(root)
      trees.push({ root, foliage, height })
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
  const hideTree = new THREE.Matrix4().makeScale(0, 0, 0)

  const animateStream = night === 1 ? addStream(scenery, map.radius) : null
  const animateWildlife = night === 1 ? addWildlife(scenery) : null
  return {
    terrain,
    animate(seconds, camera, player) {
      animateStream?.(seconds)
      animateWildlife?.(seconds)
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
