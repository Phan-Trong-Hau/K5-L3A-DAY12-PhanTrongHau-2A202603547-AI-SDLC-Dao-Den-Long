import * as THREE from 'three'
import { createGame, tuning } from './game.js'
import { moveShades } from './actors.js'
import { createLandscape } from '../demo/phase0/landscape.js'

const args = new URLSearchParams(location.search)
function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

try {
  const seed = Number(args.get('seed'))
  const duration = Number(args.get('duration')) * 1000
  const random = randomGenerator(seed)
  // Golden-angle spacing gives even coverage, and the seed rotates the pattern.
  function positions(count, radius, y) {
    const offset = random() * 2 * Math.PI
    return Array.from({ length: count }, (_, i) => {
      const angle = offset + i * (Math.PI * (3 - Math.sqrt(5)))
      const range = radius * Math.sqrt((i + 0.5) / count)
      return [range * Math.cos(angle), y, range * Math.sin(angle)]
    })
  }
  const game = createGame(seed, {
    random_motes: false, random_shades: false, random_drifters: false,
    shades: positions(200, 39, 0.8).map(pos => ({ pos, state: 'wander' })),
    motes: positions(100, 38, 0),
    lanterns: [1, 2, 3].map(n => ({ id: `L${n}`, lit: true, fuel: 100 })),
  })
  game.benchmark = true
  // The benchmark loads the same base map and lighting while bypassing cosmetic wildlife and dash effects.
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#0E1430')
  scene.fog = new THREE.FogExp2('#1B2350', 0.012)
  const landscape = createLandscape(scene, 1, { benchmark: true })
  scene.add(new THREE.HemisphereLight('#e5dfff', '#4c275c', 0.15 + 0.55 * 3 / 5))
  const moon = new THREE.DirectionalLight('#b8c7ff', 1.8)
  moon.position.set(-12, 20, -8)
  scene.add(moon)

  function mesh(geometry, parameters, x, y, z) {
    const view = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial(parameters))
    view.position.set(x, y, z)
    scene.add(view)
  }
  const post = new THREE.CylinderGeometry(0.13, 0.22, 3, 8)
  const shell = new THREE.SphereGeometry(0.57, 14, 10)
  for (const { x, y, z, lit } of game.lanterns) {
    mesh(post, { color: '#6B4A2F' }, x, y + 1.5, z)
    mesh(shell, { color: lit ? '#FFB347' : '#5B5F6E', emissive: lit ? '#F39C32' : '#000000', emissiveIntensity: 0.62 }, x, y + 3, z)
    if (lit) {
      const light = new THREE.PointLight('#FFB347', 64, 14)
      light.position.set(x, y + 3, z)
      scene.add(light)
    }
  }
  mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 12), { color: '#E8E2D0' }, 0, 0.66, 0)
  mesh(new THREE.ConeGeometry(0.49, 0.24, 14), { color: '#C9B48A' }, 0, 1.33, 0)

  const shapes = {
    shade: new THREE.SphereGeometry(0.63, 12, 8),
    mote: new THREE.SphereGeometry(0.11, 8, 6),
    halo: new THREE.SphereGeometry(0.21, 8, 6),
  }
  const shadeView = new THREE.InstancedMesh(shapes.shade, new THREE.MeshLambertMaterial({
    color: '#120A1A', emissive: '#442778', emissiveIntensity: 0.75,
  }), game.shades.length)
  const moteView = new THREE.InstancedMesh(shapes.mote, new THREE.MeshBasicMaterial({ color: '#FFF6C2' }), game.motes.length)
  const halos = new THREE.InstancedMesh(shapes.halo, new THREE.MeshBasicMaterial({
    color: '#FFE58A', transparent: true, depthWrite: false, opacity: 0.22,
  }), game.motes.length)
  scene.add(shadeView, moteView, halos)
  for (const view of [shadeView, moteView, halos]) view.frustumCulled = false

  const transform = new THREE.Object3D()
  const camera = new THREE.PerspectiveCamera(55, 1280 / 720, 0.1, 260)
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
  renderer.setSize(1280, 720)
  document.body.append(renderer.domElement)
  const gl = renderer.getContext()
  const renderedPixel = new Uint8Array(4)
  const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const device = rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
  let first
  let previous
  let elapsedTicks = 0
  const durations = []
  function frame(now) {
    first ??= now
    const time = now - first
    const elapsed = Math.floor(time * 60 / 1000)
    while (elapsedTicks < elapsed) {
      game.simTick++
      moveShades(game, tuning)
      elapsedTicks++
    }
    const angle = time / 15000 * 2 * Math.PI
    camera.position.set(30 * Math.cos(angle), 15, 30 * Math.sin(angle))
    camera.lookAt(0, 0, 0)
    landscape.animate(time / 1000, camera, game.player, game.wind)
    for (const [index, shade] of game.shades.entries()) {
      transform.position.set(shade.x, shade.y + Math.sin(time / 390 + index) * 0.16, shade.z)
      transform.scale.set(0.87, 1.24, 0.91)
      transform.updateMatrix()
      shadeView.setMatrixAt(index, transform.matrix)
    }
    transform.scale.setScalar(1)
    for (const [index, mote] of game.motes.entries()) {
      transform.position.set(mote.x, 0.7 + Math.sin(time / 750 + index) * 0.17, mote.z)
      transform.updateMatrix()
      moteView.setMatrixAt(index, transform.matrix)
      halos.setMatrixAt(index, transform.matrix)
    }
    for (const view of [shadeView, moteView, halos]) view.instanceMatrix.needsUpdate = true
    renderer.render(scene, camera)
    // Synchronize with actual framebuffer rendering before counting the frame.
    gl.readPixels(640, 360, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, renderedPixel)
    globalThis.benchFirstFrame ??= Date.now()
    const cutoff = 3000 + duration
    if (time > 3000 && previous !== undefined) durations.push(Math.min(time, cutoff) - Math.max(previous, 3000))
    previous = time
    if (time < cutoff) requestAnimationFrame(frame)
    else globalThis.benchResult = { durations, renderer: `Three.js r${THREE.REVISION} / WebGL 2 / ${device}` }
  }
  requestAnimationFrame(frame)
} catch (error) {
  globalThis.benchError = error.message
}
