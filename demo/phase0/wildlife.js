import * as THREE from 'three'

const palettes = {
  1: { feathers: '#cbd1eb', wings: '#8574aa', scales: '#57774b', markings: '#ad9b64', frog: '#7ca36d' },
  2: { feathers: '#e8c59f', wings: '#a7543c', scales: '#967343', markings: '#463e44', frog: '#a6bf56' },
  3: { feathers: '#bfd4ed', wings: '#7260ae', scales: '#536798', markings: '#c3b0d5', frog: '#56b6a2' },
}

export function streamCenter(z) {
  return 8 + Math.sin(z * 0.14) * 4 + Math.sin(z * 0.30) * 0.8
}

export function waterImmersion(x, z, radius) {
  const across = 1.72 - Math.abs(x - streamCenter(z))
  const along = radius - 2 - Math.abs(z)
  const edge = THREE.MathUtils.clamp(Math.min(across, along) / 0.64, 0, 1)
  return edge * edge * (3 - 2 * edge)
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

export function addWildlife(scene, night, radius) {
  const palette = palettes[night]
  const sphere = new THREE.SphereGeometry(1, 10, 8)
  const wingGeometry = new THREE.SphereGeometry(1, 8, 6)
  const beakGeometry = new THREE.ConeGeometry(0.12, 0.25, 6)
  const feathers = new THREE.MeshLambertMaterial({ color: palette.feathers })
  const tips = new THREE.MeshLambertMaterial({ color: palette.wings })
  const gold = new THREE.MeshLambertMaterial({ color: '#eab477' })
  const scales = new THREE.MeshLambertMaterial({ color: palette.scales })
  const markings = new THREE.MeshLambertMaterial({ color: palette.markings })
  const eye = new THREE.MeshLambertMaterial({ color: '#23172b' })
  const frogs = new THREE.MeshLambertMaterial({ color: palette.frog })
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

  const birds = Array.from({ length: night === 2 ? 4 : 6 }, (_, index) => {
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
    return { bird, wings, phase: index * 0.32, ring: index < 3 ? 15 : night === 2 ? 22 : 24 }
  })

  const snakes = Array.from({ length: 2 }, (_, index) => {
    const segments = Array.from({ length: 17 }, (_, segment) => {
      const size = segment === 0 ? 0.24 : 0.2 - segment * 0.008
      return part(poses, sphere, segment % 4 === 2 ? markings : scales, 0, 0, 0, size, size * 0.65, size * 1.25)
    })
    for (const side of [-1, 1]) part(segments[0], sphere, eye, side * 0.60, 0.57, -0.54, 0.19)
    return { segments, root: segments[0], kind: 'snake', away: false, offset: index * 2.7 }
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
    return { frog, root: frog, kind: 'frog', away: false, anchor: index * 6 - 2, order }
  })

  const turtles = []
  if (night === 2) {
    const carapace = new THREE.MeshLambertMaterial({ color: '#877746' })
    for (let index = 0; index < 2; index++) {
      const turtle = new THREE.Group()
      poses.add(turtle)
      part(turtle, sphere, carapace, 0, 0.25, 0, 0.37, 0.29, 0.49)
      part(turtle, sphere, frogs, 0, 0.17, -0.46, 0.13)
      const legs = [-1, 1].flatMap(side => [-1, 1].map(end =>
        part(turtle, sphere, frogs, side * 0.28, 0.10, end * 0.26, 0.14, 0.09, 0.16)))
      turtles.push({ turtle, legs, anchor: index * 11 - 6 })
    }
  }

  for (const batch of batches.values()) {
    batch.mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.parts.length)
    batch.mesh.frustumCulled = false
    scene.add(batch.mesh)
  }

  function animate(seconds) {
    for (const { bird, wings, phase, ring } of birds) {
      const angle = seconds * 0.28 + phase + ring * 0.2
      bird.position.set(Math.cos(angle) * ring, 8.5 + ring * 0.10 + Math.sin(angle * 3) * 0.7, Math.sin(angle) * ring)
      bird.rotation.y = Math.PI - angle
      wings[0].rotation.z = Math.sin(seconds * 10 + phase) * 0.64
      wings[1].rotation.z = -wings[0].rotation.z
    }

    for (const { segments, offset, away } of snakes) {
      for (const [index, segment] of segments.entries()) {
        const t = seconds * 0.72 + offset - index * (0.085 - index * 0.0015)
        const z = Math.sin(t * 0.58) * 5 - 9 + offset * 7
        const x = streamCenter(z) + Math.cos(t * 0.82) * 3.3
        const sway = Math.sin(t * 6.2 - index * 0.26) * 0.23
        const surfaceDepth = waterImmersion(x + sway, z, radius)
        const height = index === 0 ? 0.26 : 0.13
        segment.position.set(x + sway, away ? -100 : height - (height - 0.06) * surfaceDepth, z)
        segment.rotation.y = Math.atan2(Math.sin(t * 0.82), -Math.cos(t * 0.58))
      }
    }

    for (const { frog, anchor, order, away } of frogViews) {
      const cycle = (seconds + order * 0.87) / 2.8
      const step = Math.floor(cycle)
      const hop = Math.min(1, (cycle - step) * 2.8 / 0.75)
      const from = Math.sin(step * Math.PI / 2)
      const to = Math.sin((step + 1) * Math.PI / 2)
      const z = anchor + (from + (to - from) * hop) * 0.9
      const route = (step + hop) * 0.56 + order * 0.75
      const x = streamCenter(z) - 2.7 * Math.cos(route)
      const leap = Math.sin(hop * Math.PI)
      frog.position.set(x, away ? -100 : leap * 0.48 - 0.16 * waterImmersion(x, z, radius) * (1 - leap), z)
      frog.rotation.y = Math.sin(route) > 0 ? -Math.PI / 2 : Math.PI / 2
    }
    for (const { turtle, legs, anchor } of turtles) {
      const phase = seconds * 0.48 + anchor
      const z = anchor + Math.sin(phase) * 2.5
      const x = streamCenter(z) - Math.cos(phase) * 3.1
      turtle.position.set(x, 0.02 - 0.24 * waterImmersion(x, z, radius), z)
      turtle.rotation.y = Math.atan2(-Math.sin(phase) * 3.1, -Math.cos(phase) * 2.5)
      legs.forEach((leg, index) => { leg.rotation.y = Math.sin(seconds * 5 + index * Math.PI / 2) * 0.35 })
    }
    poses.updateMatrixWorld(true)
    for (const batch of batches.values()) {
      batch.parts.forEach((view, index) => batch.mesh.setMatrixAt(index, view.matrixWorld))
      batch.mesh.instanceMatrix.needsUpdate = true
    }
  }
  return { animate, animals: [...snakes, ...frogViews] }
}
