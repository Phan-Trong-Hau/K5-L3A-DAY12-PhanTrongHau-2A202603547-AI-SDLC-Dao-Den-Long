import * as THREE from 'three'

export function streamCenter(z) {
  return 8 + Math.sin(z * 0.14) * 4 + Math.sin(z * 0.30) * 0.8
}

export function addStream(scene, radius) {
  const start = -radius + 2
  const span = (radius - 2) * 2
  function ribbon(halfWidth, height, color) {
    const points = []
    const indices = []
    for (let index = 0; index <= 110; index++) {
      const z = start + span * index / 110
      const center = streamCenter(z)
      points.push(center - halfWidth, height, z, center + halfWidth, height, z)
      if (index > 0) {
        const right = index * 2 + 1
        indices.push(right - 3, right - 1, right - 2, right - 2, right - 1, right)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    scene.add(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color })))
  }

  ribbon(2.3, 0.051, '#686e66')
  ribbon(1.72, 0.057, '#276178')
  ribbon(1.12, 0.062, '#32758a')
  const currentGeometry = new THREE.PlaneGeometry(0.055, 0.8)
  const currentMaterial = new THREE.MeshBasicMaterial({ color: '#92cbd0', transparent: true, opacity: 0.58 })
  const ripples = new THREE.InstancedMesh(currentGeometry, currentMaterial, 52)
  ripples.frustumCulled = false
  scene.add(ripples)
  const ripple = new THREE.Object3D()
  ripple.rotation.x = -Math.PI / 2

  return seconds => {
    for (let index = 0; index < ripples.count; index++) {
      const z = start + (index * 2.47 + seconds * 2.2) % span
      ripple.position.set(streamCenter(z) + Math.sin(index * 2.39) * 1.2, 0.072, z)
      ripple.rotation.z = Math.atan((streamCenter(z + 0.2) - streamCenter(z - 0.2)) / 0.4)
      ripple.updateMatrix()
      ripples.setMatrixAt(index, ripple.matrix)
    }
    ripples.instanceMatrix.needsUpdate = true
  }
}

export function addWildlife(scene) {
  const sphere = new THREE.SphereGeometry(1, 10, 8)
  const wingGeometry = new THREE.SphereGeometry(1, 8, 6)
  const beakGeometry = new THREE.ConeGeometry(0.12, 0.25, 6)
  const feathers = new THREE.MeshLambertMaterial({ color: '#cbd1eb' })
  const tips = new THREE.MeshLambertMaterial({ color: '#8574aa' })
  const gold = new THREE.MeshLambertMaterial({ color: '#eab477' })
  const scales = new THREE.MeshLambertMaterial({ color: '#57774b' })
  const markings = new THREE.MeshLambertMaterial({ color: '#ad9b64' })
  const eye = new THREE.MeshLambertMaterial({ color: '#23172b' })
  const frogs = new THREE.MeshLambertMaterial({ color: '#7ca36d' })
  const belly = new THREE.MeshLambertMaterial({ color: '#d9d095' })

  const poses = new THREE.Group()
  const batches = new Map()
  function part(parent, geometry, material, x, y, z, width = 1, height = width, depth = width) {
    const mesh = new THREE.Object3D()
    const key = geometry.id + ':' + material.id
    if (!batches.has(key)) batches.set(key, { geometry, material, parts: [] })
    batches.get(key).parts.push(mesh)
    mesh.position.set(x, y, z)
    mesh.scale.set(width, height, depth)
    parent.add(mesh)
    return mesh
  }

  const birds = Array.from({ length: 6 }, (_, index) => {
    const bird = new THREE.Group()
    poses.add(bird)
    part(bird, sphere, feathers, 0, 0, 0, 0.32, 0.23, 0.46)
    part(bird, sphere, feathers, 0, 0.09, -0.40, 0.19)
    part(bird, beakGeometry, gold, 0, 0.065, -0.58).rotation.x = -Math.PI / 2
    const wings = [-1, 1].map(side => {
      const joint = new THREE.Group()
      joint.position.x = side * 0.19
      bird.add(joint)
      part(joint, wingGeometry, feathers, side * 0.32, 0, 0.03, 0.49, 0.085, 0.25)
      part(joint, wingGeometry, tips, side * 0.58, 0, 0.10, 0.28, 0.06, 0.17)
      return joint
    })
    return { bird, wings, phase: index * 0.32, ring: index < 3 ? 15 : 24 }
  })

  const snakes = Array.from({ length: 2 }, (_, index) => {
    const segments = Array.from({ length: 17 }, (_, segment) => {
      const size = segment === 0 ? 0.24 : 0.2 - segment * 0.008
      return part(poses, sphere, segment % 4 === 2 ? markings : scales, 0, 0, 0, size, size * 0.65, size * 1.25)
    })
    for (const side of [-1, 1]) part(segments[0], sphere, eye, side * 0.60, 0.57, -0.54, 0.19)
    return { segments, offset: index * 2.7 }
  })

  const frogViews = [-1, 1, 2].map((index, order) => {
    const frog = new THREE.Group()
    poses.add(frog)
    part(frog, sphere, frogs, 0, 0.19, 0, 0.32, 0.2, 0.29)
    part(frog, sphere, belly, 0, 0.145, -0.2, 0.23, 0.12, 0.12)
    for (const side of [-1, 1]) {
      part(frog, sphere, frogs, side * 0.26, 0.12, 0.12, 0.17, 0.11, 0.22)
      part(frog, sphere, frogs, side * 0.16, 0.32, -0.14, 0.115)
      part(frog, sphere, eye, side * 0.16, 0.34, -0.24, 0.048)
    }
    return { frog, anchor: index * 6 - 2, order }
  })

  for (const batch of batches.values()) {
    batch.mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.parts.length)
    batch.mesh.frustumCulled = false
    scene.add(batch.mesh)
  }

  return seconds => {
    for (const { bird, wings, phase, ring } of birds) {
      const angle = seconds * 0.28 + phase + ring * 0.2
      bird.position.set(Math.cos(angle) * ring, 8.5 + ring * 0.10 + Math.sin(angle * 3) * 0.7, Math.sin(angle) * ring)
      bird.rotation.y = Math.PI - angle
      wings[0].rotation.z = Math.sin(seconds * 10 + phase) * 0.64
      wings[1].rotation.z = -wings[0].rotation.z
    }

    for (const { segments, offset } of snakes) {
      for (const [index, segment] of segments.entries()) {
        const t = seconds * 0.72 + offset - index * (0.085 - index * 0.0015)
        const z = Math.sin(t * 0.58) * 5 - 9 + offset * 7
        const x = streamCenter(z) + 3.1 + Math.cos(t * 1.14) * 1.15
        const sway = Math.sin(t * 6.2 - index * 0.26) * 0.23
        segment.position.set(x + sway, index === 0 ? 0.26 : 0.13, z)
        segment.rotation.y = Math.atan2(Math.sin(t * 1.14), -Math.cos(t * 0.58))
      }
    }

    for (const { frog, anchor, order } of frogViews) {
      const cycle = (seconds + order * 0.87) / 2.8
      const step = Math.floor(cycle)
      const hop = Math.min(1, (cycle - step) * 2.8 / 0.75)
      const from = Math.sin(step * Math.PI / 2)
      const to = Math.sin((step + 1) * Math.PI / 2)
      const z = anchor + (from + (to - from) * hop) * 0.9
      frog.position.set(streamCenter(z) - 2.65, Math.sin(hop * Math.PI) * 0.48, z)
      frog.rotation.y = frog.position.z > anchor ? Math.PI : 0
    }
    poses.updateMatrixWorld(true)
    for (const batch of batches.values()) {
      batch.parts.forEach((view, index) => batch.mesh.setMatrixAt(index, view.matrixWorld))
      batch.mesh.instanceMatrix.needsUpdate = true
    }
  }
}
