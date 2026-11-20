import * as THREE from 'three'
import { availableLantern, createGame, maps, stepGame, timeLeft, tuning } from '../../src/game.js'
import { stepSeconds } from './simulation.js'
import { createLandscape } from './landscape.js'
import { createAudio } from './audio.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#0E1430')
scene.fog = new THREE.FogExp2('#1B2350', 0.012)

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" })
renderer.setPixelRatio(1)
document.body.append(renderer.domElement)

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 260)
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

const ambient = new THREE.HemisphereLight('#e5dfff', '#4c275c', 0.15)
scene.add(ambient)
const moon = new THREE.DirectionalLight('#b8c7ff', 1.8)
moon.position.set(-12, 20, -8)
scene.add(moon)

function mesh(parent, geometry, color, x, y, z, emissive = 0x000000) {
  const object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, emissive }))
  object.position.set(x, y, z)
  parent.add(object)
  return object
}

const ghostGeometry = new THREE.LatheGeometry([
  new THREE.Vector2(0, -0.72), new THREE.Vector2(0.56, -0.58),
  new THREE.Vector2(0.49, -0.30), new THREE.Vector2(0.60, 0.30),
  new THREE.Vector2(0.51, 0.61), new THREE.Vector2(0.28, 0.80), new THREE.Vector2(0, 0.86),
], 30)
const ghostVertices = ghostGeometry.attributes.position
for (let index = 0; index < ghostVertices.count; index++) {
  const y = ghostVertices.getY(index)
  if (y > -0.25) continue
  const angle = Math.atan2(ghostVertices.getZ(index), ghostVertices.getX(index))
  ghostVertices.setY(index, y + Math.sin(angle * 6) * 0.12)
}
ghostGeometry.computeVertexNormals()
const shadeMaterial = new THREE.MeshLambertMaterial({ color: '#120A1A', emissive: '#30114e' })
const stunnedMaterial = new THREE.MeshLambertMaterial({ color: '#3A3450', emissive: '#4c4c7c' })
const ghostEyes = new THREE.MeshBasicMaterial({ color: '#7A3CFF' })
const ghostMouth = new THREE.MeshBasicMaterial({ color: '#1b1029' })
const ghostFaceGeometry = new THREE.SphereGeometry(1, 12, 9)
function makeGhost() {
  const ghost = new THREE.Group()
  const body = new THREE.Mesh(ghostGeometry, shadeMaterial)
  ghost.add(body)
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Mesh(ghostFaceGeometry, shadeMaterial)
    arm.position.set(side * 0.58, 0.02, 0.05)
    arm.scale.set(0.32, 0.13, 0.17)
    ghost.add(arm)
    return arm
  })
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(ghostFaceGeometry, ghostEyes)
    eye.position.set(side * 0.19, 0.38, -0.53)
    eye.scale.set(0.084, 0.108, 0.044)
    ghost.add(eye)
  }
  const mouth = new THREE.Mesh(ghostFaceGeometry, ghostMouth)
  mouth.position.set(0, 0.09, -0.59)
  mouth.scale.set(0.083, 0.11, 0.042)
  ghost.add(mouth)
  scene.add(ghost)
  return { ghost, body, arms }
}
const player = new THREE.Group()
scene.add(player)
const pigGeometry = new THREE.SphereGeometry(1, 16, 12)
const charcoal = '#302235'
const cloak = '#E8E2D0'
const scarf = '#C8102E'
const pink = '#f291ae'
const legs = []

function pigPart(color, x, y, z, width, height, depth, parent = player) {
  const part = mesh(parent, pigGeometry, color, x, y, z)
  part.scale.set(width, height, depth)
  return part
}

pigPart(charcoal, 0, 0.62, 0.14, 0.51, 0.46, 0.67)
pigPart(cloak, 0, 0.73, 0.20, 0.515, 0.40, 0.53)
pigPart(scarf, 0, 0.86, -0.25, 0.40, 0.25, 0.16)
pigPart(charcoal, 0, 0.82, -0.43, 0.47, 0.42, 0.39)
pigPart(pink, 0, 0.76, -0.75, 0.28, 0.19, 0.15)
for (const side of [-1, 1]) {
  const ear = pigPart(charcoal, side * 0.34, 1.13, -0.4, 0.16, 0.27, 0.13)
  ear.rotation.z = -side * 0.45
  pigPart(pink, side * 0.36, 1.14, -0.49, 0.08, 0.15, 0.05).rotation.z = ear.rotation.z
  pigPart('#ffdabe', side * 0.24, 0.94, -0.71, 0.065, 0.073, 0.045)
  pigPart('#291c2a', side * 0.24, 0.94, -0.75, 0.032, 0.039, 0.025)
  pigPart('#763b59', side * 0.09, 0.76, -0.884, 0.031, 0.042, 0.025)
  for (const z of [-0.21, 0.48]) {
    const joint = new THREE.Group()
    joint.position.set(side * 0.31, 0.47, z)
    player.add(joint)
    pigPart(charcoal, 0, -0.25, 0, 0.15, 0.25, 0.15, joint)
    pigPart(pink, 0, -0.375, 0, 0.15, 0.10, 0.15, joint)
    legs.push({ joint, phase: (side < 0) === (z < 0) ? 0 : Math.PI })
  }
}
mesh(player, new THREE.ConeGeometry(0.54, 0.28, 18), '#e3ba71', 0, 1.35, -0.44)
mesh(player, new THREE.CylinderGeometry(0.021, 0.021, 0.29, 6), '#b99769', 0.44, 1.10, -0.43)
mesh(player, new THREE.SphereGeometry(0.13, 10, 8), '#ffb458', 0.44, 0.94, -0.43, '#e67719')

const pulseView = new THREE.Mesh(
  new THREE.RingGeometry(0.94, 1, 64),
  new THREE.MeshBasicMaterial({ color: '#ffcb72', transparent: true, side: THREE.DoubleSide, depthWrite: false }),
)
pulseView.rotation.x = -Math.PI / 2
pulseView.visible = false
scene.add(pulseView)
let pulseAt = -Infinity
let yaw = 0
let zoom = 1
let pointerStart = null
let pointerTarget = null
const ray = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const destinationView = new THREE.Mesh(
  new THREE.RingGeometry(0.37, 0.49, 24),
  new THREE.MeshBasicMaterial({ color: '#ffe4a5', side: THREE.DoubleSide }),
)
destinationView.rotation.x = -Math.PI / 2
destinationView.visible = false
scene.add(destinationView)

const printGeometry = new THREE.CircleGeometry(0.12, 10)
const prints = Array.from({ length: 24 }, () => {
  const print = new THREE.Mesh(printGeometry,
    new THREE.MeshBasicMaterial({ color: '#eec5a6', transparent: true, depthWrite: false }))
  print.rotation.x = -Math.PI / 2
  print.scale.y = 1.45
  print.visible = false
  scene.add(print)
  return print
})
let printIndex = 0
let stride = 0
let strideMark = 0
const hoofPosition = new THREE.Vector3()

const audio = createAudio()
const defaults = { volume: 0.55, sensitivity: 1 }
function loadSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('dao-den-long-settings')) }
  } catch {
    return { ...defaults }
  }
}
const settings = loadSettings()
audio.volume(settings.volume)
const byId = id => document.getElementById(id)
const hud = byId('hud')
const overlay = byId('overlay')
const title = byId('screen-title')
const description = byId('screen-description')
const buttons = byId('screen-actions')
const settingsPanel = byId('settings')
for (const name of Object.keys(defaults)) {
  const control = byId(name)
  control.value = settings[name]
  control.addEventListener('input', () => {
    settings[name] = control.valueAsNumber
    audio.volume(settings.volume)
    try { localStorage.setItem('dao-den-long-settings', JSON.stringify(settings)) } catch { /* Storage can be disabled. */ }
  })
}
const introduction =
  'Ông Đăng: “Nhặt đom đóm dọc bờ và thắp năm ngọn đèn. Khi sương dày lên, ánh đèn sẽ che chở cho con.”'
let screen = 'menu'
let night = 1
let game
let landscape
let landscapeNight
let seed = Date.now()
let accumulatedTime = 0
let previousTime
let cameraHeight = 0
let lastCountdown = 11

const sceneryActors = new THREE.Group()
scene.add(sceneryActors)
const lanternViews = new Map()
const moteViews = new Map()
const shadeViews = new Map()

const lanternWood = new THREE.CylinderGeometry(0.13, 0.22, 3, 8)
const lanternShell = new THREE.SphereGeometry(0.57, 14, 10)
const lanternCoreGeometry = new THREE.SphereGeometry(0.26, 10, 8)
const moteGeometry = new THREE.SphereGeometry(0.105, 8, 6)
const moteHaloGeometry = new THREE.SphereGeometry(0.2, 8, 6)
const moteMaterial = new THREE.MeshBasicMaterial({ color: '#FFF6C2' })
const moteHaloMaterial = new THREE.MeshBasicMaterial({
  color: '#FFE58A', transparent: true, opacity: 0.26, depthWrite: false,
})
function makeLantern(lantern) {
  const { x, y, z } = lantern
  const post = mesh(sceneryActors, lanternWood, '#6B4A2F', x, y + 1.5, z)
  const bulb = mesh(sceneryActors, lanternShell, '#5B5F6E', x, y + 3, z)
  const core = mesh(sceneryActors, lanternCoreGeometry, '#FFE9B0', x, y + 3, z, '#FFE9B0')
  core.visible = false
  const light = new THREE.PointLight('#FFB347', 0, 14)
  light.position.set(x, y + 3, z)
  return { post, bulb, core, light, lit: false }
}

function clearViews(views, dispose = () => {}) {
  for (const view of views.values()) dispose(view)
  views.clear()
}

function loadNight(nextNight) {
  night = nextNight
  game = createGame(seed++)
  if (landscapeNight !== night) {
    landscape?.dispose()
    landscape = createLandscape(scene, night)
    landscapeNight = night
  }
  clearViews(lanternViews, ({ post, bulb, core, light }) => {
    for (const view of [post, bulb, core, light]) {
      view.removeFromParent()
      view.material?.dispose()
    }
  })
  for (const lantern of game.lanterns) lanternViews.set(lantern.id, makeLantern(lantern))
  clearViews(moteViews, view => view.removeFromParent())
  clearViews(shadeViews, ({ ghost }) => ghost.removeFromParent())
  keys.clear()
  actions.clear()
  clearPointerTarget()
  previousTime = undefined
  accumulatedTime = 0
  lastCountdown = 11
  cameraHeight = game.player.y
  pulseAt = -Infinity
  stride = strideMark = printIndex = 0
  for (const print of prints) print.visible = false
}

function show(next, heading, text, actions = []) {
  screen = next
  overlay.hidden = next === 'play'
  hud.hidden = !['play', 'pause', 'result'].includes(next)
  settingsPanel.hidden = next !== 'settings'
  title.textContent = heading
  description.textContent = text
  buttons.replaceChildren(...actions.map(([label, callback]) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', () => {
      audio.enable()
      callback()
    })
    return button
  }))
}
function menu() {
  show('menu', 'Đảo Đèn Lồng',
    'Gom đom đóm, thắp năm đèn và giữ ngọn lửa trên Đảo Bến.\nWASD hoặc chuột phải để đi · Space để nhảy · E để nạp đèn · Q hoặc chuột trái để tỏa sáng · Esc/P để dừng.',
    [['Bắt đầu', () => introduce(1)], ['Cài đặt', () => openSettings(menu)]])
}
function play() {
  show('play', '', '')
  previousTime = undefined
}
function introduce(nextNight) {
  loadNight(nextNight)
  show('intro', `Đêm ${night} · ${maps[night].name}`, introduction,
    [['Vào đảo', play], ['Về menu', menu]])
}
function openSettings(back) {
  show('settings', 'Cài đặt', '', [['Quay lại', back]])
}
function pause() {
  keys.clear()
  actions.clear()
  clearPointerTarget()
  showPause()
}
function resume() {
  play()
}
function showPause() {
  show('pause', 'Tạm dừng', `Đêm ${night} · ${maps[night].name}`,
    [['Tiếp tục', resume], ['Chơi lại Đêm', () => introduce(night)],
      ['Cài đặt', () => openSettings(showPause)], ['Về menu', menu]])
}

function finish(result) {
  audio.play(result)
  show('result', result === 'won' ? 'Đảo đã sáng trở lại!' : 'Đêm chưa qua',
    `Điểm Đêm 1: ${game.score}`, [['Chơi lại', () => introduce(1)], ['Về menu', menu]])
}

const keys = new Set()
const actions = new Set()
const keyActions = new Map([
  ['Space', 'jump'], ['KeyE', 'interact'], ['KeyQ', 'pulse'],
])
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'])
window.addEventListener('keydown', event => {
  if (['Escape', 'KeyP'].includes(event.code) && !event.repeat) {
    if (screen === 'play' || screen === 'pause') {
      event.preventDefault()
      if (screen === 'play') pause()
      else resume()
    }
    return
  }
  const action = keyActions.get(event.code)
  if (screen !== 'play' || (!action && !movementKeys.has(event.code))) return
  event.preventDefault()
  if (movementKeys.has(event.code)) {
    keys.add(event.code)
    clearPointerTarget()
  }
  if (action && !event.repeat) actions.add(action)
})
window.addEventListener('keyup', event => keys.delete(event.code))
window.addEventListener('blur', () => {
  keys.clear()
  actions.clear()
})

const canvas = renderer.domElement
canvas.addEventListener('pointerdown', event => {
  if (screen !== 'play') return
  if (event.button === 0) {
    pointerStart = { x: event.clientX, y: event.clientY, lastX: event.clientX, dragged: false }
    canvas.setPointerCapture(event.pointerId)
  } else if (event.button === 2) {
    event.preventDefault()
    const bounds = canvas.getBoundingClientRect()
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
      1 - (event.clientY - bounds.top) / bounds.height * 2)
    ray.setFromCamera(pointer, camera)
    const [target] = ray.intersectObject(landscape.terrain, true)
    if (!target) return
    const { x, y, z } = target.point
    pointerTarget = { x, z }
    destinationView.position.set(x, y + 0.085, z)
    destinationView.visible = true
  }
})
canvas.addEventListener('pointermove', event => {
  if (!pointerStart || screen !== 'play') return
  if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) pointerStart.dragged = true
  if (pointerStart.dragged) yaw -= (event.clientX - pointerStart.lastX) * 0.008 * settings.sensitivity
  pointerStart.lastX = event.clientX
})
canvas.addEventListener('pointerup', event => {
  if (event.button !== 0) return
  if (pointerStart && !pointerStart.dragged && screen === 'play') actions.add('pulse')
  pointerStart = null
})
for (const name of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { pointerStart = null })
canvas.addEventListener('contextmenu', event => event.preventDefault())
canvas.addEventListener('wheel', event => {
  event.preventDefault()
  const amount = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1)
  zoom = THREE.MathUtils.clamp(zoom * Math.exp(amount * 0.00125), 0.54, 1.67)
}, { passive: false })

function clearPointerTarget() {
  pointerTarget = null
  destinationView.visible = false
}

function handleEvents(events, time = performance.now()) {
  for (const sound of game.sounds) audio.play(sound)
  for (const { name, data } of events) {
    if (name === 'game_over') finish(data.result)
    else audio.play(name)
    if (name === 'pulse') {
      pulseAt = time
      pulseView.position.set(game.player.x, game.player.y + 0.10, game.player.z)
    }
  }
  const seconds = Math.ceil(timeLeft(game))
  if (seconds > 0 && seconds <= 10 && seconds < lastCountdown) {
    lastCountdown = seconds
    audio.play('countdown')
  }
}

function advance(time, elapsed, cosine, sine) {
  accumulatedTime += Math.min(elapsed, 0.1)
  const localX = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
  const localZ = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'))
  const keyboardX = localX * cosine + localZ * sine
  const keyboardZ = -localX * sine + localZ * cosine
  while (accumulatedTime >= stepSeconds && screen === 'play') {
    let x = keyboardX
    let z = keyboardZ
    if (pointerTarget && !x && !z) {
      const dx = pointerTarget.x - game.player.x
      const dz = pointerTarget.z - game.player.z
      const range = Math.hypot(dx, dz)
      if (range < 0.15) clearPointerTarget()
      else {
        x = dx / range
        z = dz / range
      }
    }
    handleEvents(stepGame(game, {
      x, z, jump: actions.delete('jump'), interact: actions.delete('interact'),
      pulse: actions.delete('pulse'),
    }), time)
    accumulatedTime -= stepSeconds
  }
  audio.ambient()
}

function updatePlayer(time, previousX, previousZ) {
  const position = game.player
  player.position.set(position.x, position.y, position.z)
  player.visible = !position.respawnAt
  if (position.immuneUntil > game.simTick && Math.floor(time / 95) % 3 === 0) player.visible = false
  const walk = Math.hypot(position.x - previousX, position.z - previousZ)
  player.rotation.y = Math.atan2(-position.facingX, -position.facingZ)
  const onGround = walk > 0.001 && position.grounded
  if (onGround) stride += walk * 4.9
  for (const { joint, phase } of legs) {
    const swing = onGround ? Math.sin(stride + phase) * 0.54 : position.grounded ? 0 : -0.14
    joint.rotation.x = THREE.MathUtils.lerp(joint.rotation.x, swing, 0.58)
  }
  const mark = Math.floor(stride / Math.PI)
  if (onGround && mark > strideMark) {
    for (const { joint, phase } of legs) {
      if (phase !== (mark % 2 ? 0 : Math.PI)) continue
      joint.getWorldPosition(hoofPosition)
      const print = prints[printIndex++ % prints.length]
      print.position.set(hoofPosition.x, position.y + 0.081, hoofPosition.z)
      print.rotation.z = player.rotation.y
      print.userData.started = time
      print.visible = true
    }
    strideMark = mark
  }
  for (const print of prints) {
    if (!print.visible) continue
    const fade = 1 - (time - print.userData.started) / 630
    print.visible = fade > 0
    print.material.opacity = Math.max(0, fade) * 0.52
  }

  const progress = (time - pulseAt) / 420
  pulseView.visible = progress < 1
  if (pulseView.visible) {
    pulseView.scale.setScalar(Math.max(0.1, progress * tuning.pulse_radius))
    pulseView.material.opacity = 1 - progress
  }
}

function syncActors(items, views, add, update, remove = view => view.removeFromParent()) {
  if (views.size) {
    const ids = new Set(items.map(item => item.id))
    for (const [id, view] of views) {
      if (ids.has(id)) continue
      remove(view)
      views.delete(id)
    }
  }
  for (const [index, value] of items.entries()) {
    if (!views.has(value.id)) views.set(value.id, add(value))
    update(views.get(value.id), value, index)
  }
}

function updateActors(time) {
  syncActors(game.motes, moteViews, () => {
    const view = new THREE.Group()
    view.add(new THREE.Mesh(moteGeometry, moteMaterial), new THREE.Mesh(moteHaloGeometry, moteHaloMaterial))
    scene.add(view)
    return view
  }, (view, mote) => view.position.set(mote.x, mote.y + 0.68 + Math.sin(time / 750 + mote.x) * 0.22, mote.z))

  syncActors(game.shades, shadeViews, makeGhost, ({ ghost, body, arms }, shade, index) => {
    ghost.position.set(shade.x, shade.y + Math.sin(time / 390 + index) * 0.16, shade.z)
    ghost.rotation.y = Math.atan2(shade.x - game.player.x, shade.z - game.player.z)
    body.material = shade.state === 'stunned' ? stunnedMaterial : shadeMaterial
    for (const [side, arm] of arms.entries()) {
      arm.material = body.material
      arm.rotation.z = Math.sin(time / 260 + index) * (side === 0 ? -0.25 : 0.25)
    }
  }, ({ ghost }) => ghost.removeFromParent())

  for (const lantern of game.lanterns) {
    const view = lanternViews.get(lantern.id)
    if (view.lit === lantern.lit) continue
    view.lit = lantern.lit
    view.bulb.material.color.set(lantern.lit ? '#FFB347' : '#5B5F6E')
    view.bulb.material.emissive.set(lantern.lit ? '#FFB347' : '#000000')
    view.bulb.material.emissiveIntensity = 0.62
    view.bulb.material.transparent = lantern.lit
    view.bulb.material.opacity = lantern.lit ? 0.75 : 1
    view.core.visible = lantern.lit
    view.light.intensity = lantern.lit ? 64 : 0
    if (lantern.lit) sceneryActors.add(view.light)
    else view.light.removeFromParent()
  }
}

const motesHud = byId('motes')
const moteSlots = Array.from({ length: tuning.carry_capacity }, () => document.createElement('span'))
motesHud.replaceChildren(...moteSlots)
const arrow = byId('arrow')
const arrowTarget = new THREE.Vector3()
const headingVector = new THREE.Vector3()
const viewPoint = new THREE.Vector3()
const hudText = (id, text) => {
  const element = byId(id)
  if (element.textContent !== text) element.textContent = text
}
function updateHud() {
  const count = game.lanterns.filter(lantern => lantern.lit).length
  ambient.intensity = 0.15 + 0.55 * count / game.lanterns.length
  if (hud.hidden) return
  const { carried, flames, pulseReady } = game.player
  const seconds = Math.ceil(timeLeft(game))
  hudText('flames', '🔥'.repeat(flames) + '○'.repeat(Math.max(0, tuning.flames - flames)))
  hudText('timer', `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`)
  byId('timer').classList.toggle('danger', seconds <= 30)
  hudText('score', `Đèn ${count}/${game.lanterns.length} · ${game.score} điểm`)
  moteSlots.forEach((slot, index) => slot.classList.toggle('full', index < carried))
  motesHud.setAttribute('aria-label', `Đom đóm ${carried}/${tuning.carry_capacity}`)
  const cooldown = until => until > game.simTick ? `${((until - game.simTick) / 60).toFixed(1)}s` : 'sẵn sàng'
  hudText('cooldowns', `✦ Q ${cooldown(pulseReady)}`)
  const nearby = availableLantern(game, game.player)
  hudText('hint', nearby ? `E — Nạp ánh sáng (${nearby.deposited}/${tuning.lantern_cost})`
    : game.wind.warning ? 'Gió mạnh sắp đến' : '')

  const target = availableLantern(game, game.player, Infinity)
  if (!target) {
    arrow.hidden = true
    return
  }
  arrowTarget.set(target.x, target.y + 2, target.z)
  viewPoint.copy(arrowTarget).project(camera)
  camera.getWorldDirection(headingVector)
  const ahead = headingVector.dot(arrowTarget.sub(camera.position)) > 0
  arrow.hidden = ahead && Math.abs(viewPoint.x) < 0.96 && Math.abs(viewPoint.y) < 0.92
  if (!arrow.hidden) {
    const bearingX = ahead ? viewPoint.x : -viewPoint.x
    const bearingY = ahead ? viewPoint.y : -viewPoint.y
    const scale = 0.82 / Math.max(0.82, Math.abs(bearingX), Math.abs(bearingY))
    arrow.style.left = `${(1 + bearingX * scale) * 50}%`
    arrow.style.top = `${(1 - bearingY * scale) * 50}%`
    arrow.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(bearingX, bearingY)}rad)`
  }
}

function frame(time) {
  const elapsed = (time - (previousTime ?? time)) / 1000
  previousTime = time
  const cosine = Math.cos(yaw)
  const sine = Math.sin(yaw)
  const before = game.player
  const oldX = before.x
  const oldZ = before.z
  if (screen === 'play') advance(time, elapsed, cosine, sine)
  const position = game.player
  updatePlayer(time, oldX, oldZ)
  cameraHeight = THREE.MathUtils.lerp(cameraHeight, Math.max(-3, position.y), 0.16)
  const cameraOffset = 14 * zoom
  camera.position.set(position.x + cameraOffset * sine, cameraHeight + 9 * zoom, position.z + cameraOffset * cosine)
  camera.lookAt(position.x - 2.5 * sine, cameraHeight + 1.45, position.z - 2.5 * cosine)
  camera.updateMatrixWorld()
  landscape.animate(time / 1000, camera, position, game.wind)
  updateActors(time)
  updateHud()
  renderer.render(scene, camera)
}

loadNight(1)
menu()
renderer.setAnimationLoop(frame)
