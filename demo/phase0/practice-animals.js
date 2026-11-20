import * as THREE from 'three'
import { stunShade } from '../../src/actors.js'
import { surfaces } from '../../src/maps.js'

const reach = 2
const range = 9
const stunTicks = 90
const animalName = { frog: 'ếch', snake: 'rắn' }

function makeModel(kind, scene) {
  const view = new THREE.Group()
  view.name = 'practice-animal'
  const geometry = new THREE.SphereGeometry(1, 12, 8)
  const color = kind === 'frog' ? '#97b754' : '#728e48'
  const green = new THREE.MeshLambertMaterial({ color, emissive: '#193217' })
  const stripe = new THREE.MeshLambertMaterial({ color: '#dfbb67' })
  const dark = new THREE.MeshBasicMaterial({ color: '#162222' })
  function part(material, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.scale.set(sx, sy, sz)
    view.add(mesh)
  }
  if (kind === 'frog') {
    part(green, 0, 0.14, 0.04, 0.27, 0.16, 0.31)
    part(stripe, 0, 0.10, -0.15, 0.17, 0.10, 0.13)
    for (const side of [-1, 1]) {
      part(green, 0.23 * side, 0.07, 0.15, 0.16, 0.085, 0.19)
      part(green, 0.135 * side, 0.25, -0.10, 0.09, 0.10, 0.10)
      part(dark, 0.135 * side, 0.27, -0.184, 0.040, 0.048, 0.024)
    }
  } else {
    for (let index = 0; index < 10; index++) {
      const width = 0.14 - index * 0.009
      part(index % 3 === 2 ? stripe : green, Math.sin(index * 0.55) * 0.20, width, index * 0.095 - 0.32,
        width, width * 0.75, width * 1.2)
    }
    for (const side of [-1, 1]) part(dark, 0.080 * side, 0.18, -0.407, 0.03, 0.033, 0.026)
  }
  scene.add(view)
  return view
}

function floorAt(game, x, z, ceiling = Infinity) {
  return Math.max(-Infinity, ...surfaces(game.night, x, z).map(level => level.y).filter(y => y <= ceiling))
}

export function createPracticeAnimals(scene) {
  let active
  let notice
  let noticeUntil = 0

  function release() {
    if (!active) return
    active.animal.away = false
    for (const geometry of new Set(active.view.children.map(mesh => mesh.geometry))) geometry.dispose()
    for (const material of new Set(active.view.children.map(mesh => mesh.material))) material.dispose()
    active.view.removeFromParent()
    active = undefined
  }

  function candidate(game, landscape) {
    return landscape.nearbyAnimal(game.player, reach)
  }

  function targetShade(game) {
    const { player } = game
    let best
    let distance = range
    for (const shade of game.shades) {
      const dx = shade.x - player.x
      const dz = shade.z - player.z
      const span = Math.hypot(dx, dz)
      if (shade.state === 'spawning' || span >= distance ||
          span > 1.75 && dx * player.facingX + dz * player.facingZ < span * 0.15) continue
      best = shade
      distance = span
    }
    return best
  }

  function throwAnimal(game) {
    const { player } = game
    const shade = targetShade(game)
    const point = shade ? new THREE.Vector3(shade.x, 0, shade.z)
      : new THREE.Vector3(player.x + player.facingX * 6, 0, player.z + player.facingZ * 6)
    const elevationLimit = Math.max(player.y + 1, shade?.y ?? player.y)
    let ground = floorAt(game, point.x, point.z, elevationLimit)
    for (let index = 0; index < 18 && !Number.isFinite(ground); index++) {
      point.x = (point.x * 0.8 + player.x * 0.2)
      point.z = (point.z * 0.8 + player.z * 0.2)
      ground = floorAt(game, point.x, point.z, elevationLimit)
    }
    if (!Number.isFinite(ground)) return
    point.y = ground + 0.02
    const direction = Math.atan2(player.x - point.x, player.z - point.z)
    Object.assign(active, {
      mode: 'flight', origin: active.view.position.clone(), end: point,
      direction, tick: game.simTick, target: shade, elevationLimit,
      hit: false, duration: Math.max(19, Math.min(40, Math.round(active.view.position.distanceTo(point) * 4))),
    })
    active.view.rotation.y = direction
  }

  function stunNearby(game, from, to) {
    if (from.distanceToSquared(to) < 1e-8) return
    const segment = new THREE.Line3(from, to)
    const point = new THREE.Vector3()
    const near = new THREE.Vector3()
    for (const shade of game.shades) {
      if (shade.state === 'spawning') continue
      point.set(shade.x, shade.y, shade.z)
      segment.closestPointToPoint(point, true, near)
      if (near.distanceToSquared(point) > 0.85 ** 2) continue
      const until = game.simTick + stunTicks
      if (shade.state !== 'stunned' || shade.stateUntil < until) stunShade(shade, until)
      active.hit = true
      notice = 'Bóng Mực choáng'
      noticeUntil = game.simTick + 100
      return
    }
  }

  return {
    interact(game, landscape) {
      if (game.player.respawnAt) return
      if (active?.mode === 'held') {
        throwAnimal(game)
        return
      }
      if (active) return
      const animal = candidate(game, landscape)
      if (!animal) return
      animal.away = true
      active = { animal, mode: 'held', view: makeModel(animal.kind, scene) }
    },
    step(game) {
      if (!active) return
      const { view, mode } = active
      const { player, simTick } = game
      if (mode === 'held') {
        view.position.set(player.x + player.facingX * 0.66, player.y + 0.78, player.z + player.facingZ * 0.66)
        view.rotation.y = Math.atan2(-player.facingX, -player.facingZ)
        return
      }
      if (mode === 'flight') {
        const progress = Math.min(1, (simTick - active.tick) / active.duration)
        const previous = view.position.clone()
        const target = active.target
        if (!active.hit && target && Math.hypot(target.x - active.origin.x, target.z - active.origin.z) <= range) {
          const ground = floorAt(game, target.x, target.z, active.elevationLimit)
          if (Number.isFinite(ground)) active.end.lerp(new THREE.Vector3(target.x, ground + 0.02, target.z), 0.16)
        }
        view.position.lerpVectors(active.origin, active.end, progress)
        view.position.y += Math.sin(progress * Math.PI) * 0.93
        view.rotation.z = Math.sin(progress * Math.PI) * 0.44
        if (!active.hit) stunNearby(game, previous, view.position)
        if (progress >= 1) {
          active.mode = 'escape'
          active.tick = simTick
          view.rotation.z = 0
        }
        return
      }

      const age = simTick - active.tick
      if (age >= 37) {
        release()
        return
      }
      const x = view.position.x - Math.sin(active.direction) * 0.055
      const z = view.position.z - Math.cos(active.direction) * 0.055
      const y = floorAt(game, x, z, active.end.y + 0.4)
      if (Number.isFinite(y)) {
        view.position.set(x, y + Math.abs(Math.sin(age * 0.30)) * (active.animal.kind === 'frog' ? 0.25 : 0.055), z)
      }
    },
    hint(game, landscape, key) {
      if (active?.mode === 'held') return `${key} · Ném ${animalName[active.animal.kind]}`
      if (noticeUntil > game.simTick) return notice
      if (active) return 'Con vật đang chạy đi'
      const nearby = candidate(game, landscape)
      return nearby ? `${key} · Bắt ${animalName[nearby.kind]}` : 'Tìm ếch hoặc rắn gần suối'
    },
    reset() {
      release()
      notice = undefined
      noticeUntil = 0
    },
  }
}
