import * as THREE from 'three'
import { availableLantern, capacity, createGame, maps, stepGame, timeLeft, tuning } from '../../src/game.js'
import { dt as stepSeconds } from '../../src/movement.js'
import { createLandscape } from './landscape.js'
import { addScore, downloadScores, getScores } from './local-scores.js'
import { validName } from '../../src/leaderboard.js'
import { createAudio } from './audio.js'
import { createDashPuffEffect } from './dash-puff.js'
import { fuelOf, lightCost, lowFuel, nearestLantern } from '../../src/lanterns.js'

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
const ghostOutline = new THREE.MeshBasicMaterial({ color: '#7A3CFF', side: THREE.BackSide })
const ghostMouth = new THREE.MeshBasicMaterial({ color: '#1b1029' })
const ghostFaceGeometry = new THREE.SphereGeometry(1, 12, 9)
function makeGhost() {
  const ghost = new THREE.Group()
  const body = new THREE.Mesh(ghostGeometry, shadeMaterial)
  ghost.add(body)
  const outline = new THREE.Mesh(ghostGeometry, ghostOutline)
  outline.scale.setScalar(1.08)
  ghost.add(outline)
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
const charcoal = '#241e2b'
const cloak = '#E8E2D0'
const scarf = '#C8102E'
const pink = '#ff92b4'
const legs = []

function pigPart(color, x, y, z, width, height, depth, parent = player) {
  const part = mesh(parent, pigGeometry, color, x, y, z)
  part.scale.set(width, height, depth)
  return part
}

pigPart(charcoal, 0, 0.62, 0.14, 0.51, 0.46, 0.67)
pigPart(cloak, 0, 0.75, -0.03, 0.49, 0.36, 0.24)
const curlyTail = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.73, 0.73), new THREE.Vector3(0.05, 0.82, 0.85),
  new THREE.Vector3(0.17, 0.90, 0.85), new THREE.Vector3(0.23, 0.83, 0.84),
  new THREE.Vector3(0.17, 0.78, 0.86), new THREE.Vector3(0.12, 0.84, 0.89),
])
mesh(player, new THREE.TubeGeometry(curlyTail, 20, 0.036, 6, false), pink, 0, 0, 0)
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
    legs.push({ joint, front: z < 0, phase: (side < 0) === (z < 0) ? 0 : Math.PI })
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
const stompImpact = 6
const pulseLife = 26
const hoofGlowGeometry = new THREE.CircleGeometry(1, 16)
const hoofGlowMaterial = new THREE.MeshBasicMaterial({
  color: '#ff9fcb', transparent: true, depthWrite: false, side: THREE.DoubleSide,
})
const stompMarks = new THREE.Group()
stompMarks.visible = false
for (const foot of [-1, 1]) {
  for (const toe of [-1, 1]) {
    const print = new THREE.Mesh(hoofGlowGeometry, hoofGlowMaterial)
    print.rotation.x = -Math.PI / 2
    print.position.set(foot * 0.31 + toe * 0.067, 0, -0.36)
    print.scale.set(0.062, 0.14, 1)
    stompMarks.add(print)
  }
}
scene.add(stompMarks)
let stompAt = -Infinity
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
const dashPuffs = createDashPuffEffect(scene)
const defaults = { volume: 0.55, sensitivity: 1, accessiblePalette: false, reducedMotion: false, largeText: false }
const defaultKeys = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space',
  dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyQ', pause: 'Escape',
}
const actionLabels = {
  up: 'Lên', down: 'Xuống', left: 'Trái', right: 'Phải', jump: 'Nhảy', dash: 'Lướt',
  interact: 'Nạp đèn', pulse: 'Tỏa Sáng', pause: 'Tạm dừng',
}
const fallbackKeys = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ShiftRight: 'dash', KeyP: 'pause',
}
function keyLabel(code) {
  return ({ Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift phải', Escape: 'Esc' })[code] ??
    code.replace(/^(Key|Digit)/, '')
}
function loadSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('dao-den-long-settings')) }
  } catch {
    return { ...defaults }
  }
}
const settings = loadSettings()
let bindings = { ...defaultKeys, ...settings.bindings }
let bindingAction
function saveSettings() {
  try { localStorage.setItem('dao-den-long-settings', JSON.stringify({ ...settings, bindings })) } catch { /* Storage can be disabled. */ }
}
function applySettings() {
  audio.volume(settings.volume)
  document.body.classList.toggle('accessible-palette', settings.accessiblePalette)
  document.body.classList.toggle('reduced-motion', settings.reducedMotion)
  document.documentElement.classList.toggle('large-text', settings.largeText)
  const accent = settings.accessiblePalette ? '#00B3FF' : '#7A3CFF'
  ghostEyes.color.set(accent)
  ghostOutline.color.set(accent)
}
applySettings()
const byId = id => document.getElementById(id)
const hud = byId('hud')
const overlay = byId('overlay')
const title = byId('screen-title')
const description = byId('screen-description')
const buttons = byId('screen-actions')
const settingsPanel = byId('settings')
for (const name of Object.keys(defaults)) {
  const control = byId(name)
  const checkbox = control.type === 'checkbox'
  if (checkbox) control.checked = settings[name]
  else control.value = settings[name]
  control.addEventListener('input', () => {
    settings[name] = checkbox ? control.checked : control.valueAsNumber
    applySettings()
    saveSettings()
  })
}
const bindingPanel = byId('bindings')
const bindingMessage = byId('binding-message')
const content = byId('screen-content')
function renderBindings() {
  bindingPanel.replaceChildren(...Object.entries(actionLabels).map(([action, label]) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = `${label} · ${action === bindingAction ? 'Nhấn phím…' : keyLabel(bindings[action])}`
    button.setAttribute('aria-pressed', String(action === bindingAction))
    button.addEventListener('click', () => {
      bindingAction = action
      bindingMessage.textContent = 'Nhấn phím mới.'
      renderBindings()
    })
    return button
  }))
  byId('dash-key').textContent = keyLabel(bindings.dash)
  byId('pulse-key').textContent = keyLabel(bindings.pulse)
}
byId('reset-bindings').addEventListener('click', () => {
  bindings = { ...defaultKeys }
  bindingAction = undefined
  bindingMessage.textContent = 'Đã khôi phục phím mặc định.'
  saveSettings()
  renderBindings()
})
renderBindings()

const introductions = [
  'Ông Đăng: “Giữ ít nhất ba đèn sáng tới bình minh. Châm thêm dầu trước khi Bóng Mực tìm được đèn yếu.”',
  'Ông Đăng: “Giữ bốn đèn sáng tới bình minh. Cầu tre dẫn sang bờ bên kia. Bục nhảy cũng đưa con qua biển mây. Giữ chặt đom đóm khi Gió Lạc đến.”',
  'Ông Đăng: “Giữ năm đèn sáng tới bình minh. Men theo dốc rồi dùng bục nhảy đến tháp chuông. Khi lá tung lên, hãy chuẩn bị đón gió.”',
]
let screen = 'menu'
let night = 1
let total = 0
let game
let landscape
let landscapeNight
let campaignSeed = Date.now()
let nightsWon = 0
let spawnNotice
let accumulatedTime = 0
let previousTime
let cameraHeight = 0
let playerImmersion = 0
let lastCountdown = 11

const sceneryActors = new THREE.Group()
scene.add(sceneryActors)
const lanternViews = new Map()
const moteViews = new Map()
const shadeViews = new Map()
const drifterViews = new Map()
const charmViews = new Map()

const lanternWood = new THREE.CylinderGeometry(0.13, 0.22, 3, 8)
const lanternShell = new THREE.SphereGeometry(0.57, 14, 10)
const meterBackgroundGeometry = new THREE.PlaneGeometry(1.26, 0.18)
const meterFillGeometry = new THREE.PlaneGeometry(1.17, 0.105)
const meterBackground = new THREE.MeshBasicMaterial({ color: '#121725' })
const fuelFullMaterial = new THREE.MeshBasicMaterial({ color: '#F2C14E' })
const fuelLowMaterial = new THREE.MeshBasicMaterial({ color: '#FFB347' })
const tornPaper = new THREE.Shape()
tornPaper.moveTo(-0.11, 0.15)
tornPaper.lineTo(0.12, 0.04)
tornPaper.lineTo(0.03, -0.03)
tornPaper.lineTo(0.15, -0.15)
tornPaper.lineTo(-0.06, -0.07)
tornPaper.closePath()
const tearGeometry = new THREE.ShapeGeometry(tornPaper)
const tearMaterial = new THREE.MeshBasicMaterial({ color: '#131725', side: THREE.DoubleSide })
const towardCamera = new THREE.Vector3()
const lanternCoreGeometry = new THREE.SphereGeometry(0.26, 10, 8)
const moteGeometry = new THREE.SphereGeometry(1, 10, 8)
const moteBodyMaterial = new THREE.MeshBasicMaterial({ color: '#a36d33' })
const moteMaterial = new THREE.MeshBasicMaterial({ color: '#FFF6C2' })
const moteWingMaterial = new THREE.MeshBasicMaterial({ color: '#fff1ce', transparent: true, opacity: 0.72 })
const glowCanvas = document.createElement('canvas')
glowCanvas.width = glowCanvas.height = 64
const glowContext = glowCanvas.getContext('2d')
const gradient = glowContext.createRadialGradient(32, 32, 0, 32, 32, 31)
gradient.addColorStop(0, 'rgba(255,230,153,0.92)')
gradient.addColorStop(0.26, 'rgba(255,205,88,0.40)')
gradient.addColorStop(1, 'rgba(255,189,70,0)')
glowContext.fillStyle = gradient
glowContext.fillRect(0, 0, 64, 64)
const moteHaloMaterial = new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
})

const charmGeometry = new THREE.PlaneGeometry(0.49, 0.78)
const charmBorder = new THREE.PlaneGeometry(0.62, 0.94)
const charmMaterial = new THREE.MeshBasicMaterial({ color: '#C8102E', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 })
const charmBorderMaterial = new THREE.MeshBasicMaterial({ color: '#F2C14E', side: THREE.DoubleSide })
const drifterGeometry = new THREE.PlaneGeometry(0.7, 0.35, 4, 2)
const drifterMaterial = new THREE.MeshStandardMaterial({
  color: '#8FA3B8', emissive: '#35435b', side: THREE.DoubleSide, transparent: true, opacity: 0.9,
})

function makeLantern(lantern) {
  const { x, y, z } = lantern
  const post = mesh(sceneryActors, lanternWood, '#6B4A2F', x, y + 1.5, z)
  const bulb = mesh(sceneryActors, lanternShell, '#5B5F6E', x, y + 3, z)
  const core = mesh(sceneryActors, lanternCoreGeometry, '#FFE9B0', x, y + 3, z, '#FFE9B0')
  core.visible = false
  const light = new THREE.PointLight('#FFB347', 0, 14)
  light.position.set(x, y + 3, z)
  bulb.scale.y = 0.8
  const meter = new THREE.Group()
  const fill = new THREE.Mesh(meterFillGeometry, fuelFullMaterial)
  fill.position.z = 0.004
  meter.add(new THREE.Mesh(meterBackgroundGeometry, meterBackground), fill)
  meter.position.set(x, y + 3.85, z)
  meter.visible = false
  const tear = new THREE.Mesh(tearGeometry, tearMaterial)
  sceneryActors.add(meter, tear)
  return { post, bulb, core, light, meter, fill, tear, lit: false }
}

function clearViews(views, dispose = () => {}) {
  for (const view of views.values()) dispose(view)
  views.clear()
}

function loadNight(nextNight) {
  night = nextNight
  game = createGame(campaignSeed + night - 1, {}, night)
  spawnNotice = undefined
  if (landscapeNight !== night) {
    landscape?.dispose()
    landscape = createLandscape(scene, night)
    landscapeNight = night
  }
  clearViews(lanternViews, ({ post, bulb, core, light, meter, tear }) => {
    for (const view of [post, bulb, core, light, meter, tear]) view.removeFromParent()
    for (const view of [post, bulb, core]) view.material.dispose()
  })
  for (const lantern of game.lanterns) lanternViews.set(lantern.id, makeLantern(lantern))
  clearViews(moteViews, view => view.removeFromParent())
  clearViews(shadeViews, ({ ghost }) => ghost.removeFromParent())
  clearViews(drifterViews, view => view.removeFromParent())
  clearViews(charmViews, view => view.removeFromParent())
  keys.clear()
  actions.clear()
  clearPointerTarget()
  previousTime = undefined
  accumulatedTime = 0
  lastCountdown = 11
  cameraHeight = game.player.y
  playerImmersion = 0
  stompAt = -Infinity
  pulseView.visible = stompMarks.visible = false
  dashPuffs.clear()
  stride = strideMark = printIndex = 0
  for (const print of prints) print.visible = false
}

function show(next, heading, text, actions = []) {
  screen = next
  bindingAction = undefined
  bindingMessage.textContent = ''
  content.replaceChildren()
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
    'Giữ đủ đèn sáng đến bình minh. Dùng đom đóm để thắp đèn hoặc châm dầu.\nWASD hoặc chuột phải để đi · Space để nhảy · Shift để lướt và xì hơi · E để nạp đèn · Q hoặc chuột trái để tỏa sáng · Esc/P để dừng.',
    [['Bắt đầu', () => { total = 0; nightsWon = 0; campaignSeed = Date.now(); introduce(1) }],
      ['Bảng xếp hạng', showLeaderboard], ['Cài đặt', () => openSettings(menu)]])
}
function play() {
  show('play', '', '')
  previousTime = undefined
}
function introduce(nextNight) {
  loadNight(nextNight)
  show('intro', `Đêm ${night} · ${maps[night].name}`, introductions[night - 1],
    [['Vào đảo', play], ['Về menu', menu]])
}
function openSettings(back) {
  show('settings', 'Cài đặt', '', [['Quay lại', back]])
  renderBindings()
}
function pause() {
  keys.clear()
  actions.clear()
  clearPointerTarget()
  stepGame(game, { pause: true, x: 0, z: 0 })
  showPause()
}
function resume() {
  play()
  handleEvents(stepGame(game, { pause: true, x: 0, z: 0 }))
}
function showPause() {
  show('pause', 'Tạm dừng', `Đêm ${night} · ${maps[night].name}`,
    [['Tiếp tục', resume], ['Chơi lại Đêm', () => introduce(night)],
      ['Cài đặt', () => openSettings(showPause)], ['Về menu', menu]])
}

function scoreForm() {
  const form = document.createElement('form')
  form.className = 'score-form'
  const input = document.createElement('input')
  input.name = 'name'
  input.placeholder = 'Tên người chơi'
  input.setAttribute('aria-label', 'Tên người chơi, từ 3 đến 12 ký tự')
  input.required = true
  input.maxLength = 12
  input.pattern = '[A-Za-z0-9_]{3,12}'
  const button = document.createElement('button')
  button.type = 'submit'
  button.textContent = 'Lưu điểm'
  const message = document.createElement('p')
  message.setAttribute('role', 'status')
  form.append(input, button)
  content.append(form, message)
  form.addEventListener('submit', async event => {
    event.preventDefault()
    const name = input.value.trim()
    if (!validName(name) || button.disabled) return
    button.disabled = true
    try {
      await addScore({ name, score: total, nights_won: nightsWon, achieved_at: new Date().toISOString(), seed: campaignSeed })
      form.replaceWith()
      message.textContent = 'Đã lưu điểm.'
    } catch {
      message.textContent = 'Không lưu được điểm. Bạn có thể thử lại.'
      button.disabled = false
    }
  })
}

async function showLeaderboard() {
  let entries = []
  show('leaderboard', 'Bảng xếp hạng', 'Đang tải…',
    [['Về menu', menu], ['Xuất JSON', () => downloadScores(entries)]])
  try {
    entries = await getScores()
    if (screen !== 'leaderboard') return
    description.textContent = entries.length ? '' : 'Chưa có điểm đã lưu.'
    const list = document.createElement('ol')
    list.className = 'score-list'
    for (const entry of entries) {
      const item = document.createElement('li')
      item.textContent = `${entry.name} · ${entry.score} điểm · ${entry.nights_won}/3 đêm`
      list.append(item)
    }
    content.replaceChildren(list)
  } catch {
    if (screen === 'leaderboard') description.textContent = 'Không đọc được điểm đã lưu.'
  }
}

function finish(result) {
  audio.play(result)
  if (result === 'won') {
    total += game.score
    nightsWon++
  }
  const text = `Điểm Đêm ${night}: ${game.score} · Tổng điểm: ${total}`
  if (result === 'won' && night === 3) {
    show('dawn', 'Bình Minh', `Cả ba đảo đã sáng trở lại. Tổng điểm: ${total}.`, [['Về menu', menu]])
    scoreForm()
    return
  }
  show('result', result === 'won' ? 'Đảo đã sáng trở lại!' : 'Đêm chưa qua',
    text, [[result === 'won' ? 'Đêm kế tiếp' : 'Chơi lại Đêm',
      () => introduce(result === 'won' ? night + 1 : night)], ['Về menu', menu]])
  if (result === 'lost') scoreForm()
}

const keys = new Set()
const actions = new Set()
const directions = new Set(['up', 'down', 'left', 'right'])
function mapKey(code) {
  const direct = Object.keys(bindings).find(action => bindings[action] === code)
  if (direct) return direct
  const alternate = fallbackKeys[code]
  return alternate && bindings[alternate] === defaultKeys[alternate] ? alternate : undefined
}
function isHeld(action) {
  return [...keys].some(code => mapKey(code) === action)
}
window.addEventListener('keydown', event => {
  if (bindingAction && !event.repeat) {
    event.preventDefault()
    const action = bindingAction
    const duplicate = mapKey(event.code)
    if (duplicate && duplicate !== action) {
      bindingMessage.textContent = `Phím ${keyLabel(event.code)} đang dùng cho ${actionLabels[duplicate]}.`
      return
    }
    bindings[action] = event.code
    bindingAction = undefined
    bindingMessage.textContent = 'Đã lưu phím mới.'
    saveSettings()
    renderBindings()
    return
  }
  const action = mapKey(event.code)
  if (action === 'pause' && !event.repeat && ['play', 'pause'].includes(screen)) {
    event.preventDefault()
    if (screen === 'play') pause()
    else resume()
    return
  }
  if (screen !== 'play' || !action || action === 'pause') return
  event.preventDefault()
  if (directions.has(action)) {
    keys.add(event.code)
    clearPointerTarget()
  } else if (!event.repeat) actions.add(action)
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

function handleEvents(events) {
  for (const sound of game.sounds) audio.play(sound)
  for (const { name, data } of events) {
    if (name === 'game_over') finish(data.result)
    else audio.play(name)
    if (name === 'shade_spawned') spawnNotice = { id: data.id, until: game.simTick + 180 }
    if (name === 'dash') dashPuffs.emit(game.player, game.simTick)
    if (name === 'pulse') {
      stompAt = game.simTick
      const { x, y, z, facingX, facingZ } = game.player
      pulseView.position.set(x, y + 0.10, z)
      stompMarks.position.set(x, y + 0.105, z)
      stompMarks.rotation.y = Math.atan2(-facingX, -facingZ)
    }
  }
  const seconds = Math.ceil(timeLeft(game))
  if (seconds > 0 && seconds <= 10 && seconds < lastCountdown) {
    lastCountdown = seconds
    audio.play('countdown')
  }
}

function advance(elapsed, cosine, sine) {
  accumulatedTime += Math.min(elapsed, 0.1)
  const localX = Number(isHeld('right')) - Number(isHeld('left'))
  const localZ = Number(isHeld('down')) - Number(isHeld('up'))
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
      pulse: actions.delete('pulse'), dash: actions.delete('dash'),
    }))
    accumulatedTime -= stepSeconds
  }
  audio.ambient()
}

function updatePlayer(time, elapsed, previousX, previousZ) {
  const position = game.player
  const immersion = landscape.immersionAt(position)
  playerImmersion = THREE.MathUtils.lerp(playerImmersion, immersion, 1 - Math.exp(-Math.min(elapsed, 0.1) * 8))
  player.position.set(position.x, position.y - playerImmersion * 0.56, position.z)
  player.visible = !position.respawnAt
  if (position.immuneUntil > game.simTick && Math.floor(time / 95) % 3 === 0) player.visible = false
  const walk = Math.hypot(position.x - previousX, position.z - previousZ)
  player.rotation.y = Math.atan2(-position.facingX, -position.facingZ)
  const stompAge = game.simTick - stompAt
  const lift = stompAge < stompImpact
    ? Math.sin(Math.PI * stompAge / stompImpact) : 0
  const recoil = stompAge >= stompImpact && stompAge < stompImpact + 7
    ? Math.sin(Math.PI * (stompAge - stompImpact) / 7) : 0
  const motion = settings.reducedMotion ? 0.42 : 1
  player.rotation.x = (0.29 * lift - 0.095 * recoil) * motion
  const onGround = walk > 0.001 && position.grounded
  if (onGround) stride += walk * 4.9
  for (const { joint, phase, front } of legs) {
    const swing = onGround ? Math.sin(stride + phase) * 0.54 : position.grounded ? 0 : -0.14
    if (stompAge < stompImpact + 7) {
      joint.rotation.x = front ? (0.66 * lift - 0.20 * recoil) * motion : 0
    } else {
      joint.rotation.x = THREE.MathUtils.lerp(joint.rotation.x, swing, 0.58)
    }
  }
  const mark = Math.floor(stride / Math.PI)
  if (onGround && stompAge >= stompImpact + 7 && playerImmersion < 0.14 && mark > strideMark) {
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

  const progress = (stompAge - stompImpact) / pulseLife
  pulseView.visible = progress >= 0 && progress < 1
  stompMarks.visible = pulseView.visible && progress < 0.65
  if (pulseView.visible) {
    pulseView.scale.setScalar(Math.max(0.27, progress * tuning.pulse_radius))
    pulseView.material.opacity = (settings.reducedMotion ? 0.4 : 0.95) * (1 - progress)
  }
  if (stompMarks.visible) {
    hoofGlowMaterial.opacity = (settings.reducedMotion ? 0.45 : 0.88) * (1 - progress / 0.65)
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
    const body = new THREE.Mesh(moteGeometry, moteBodyMaterial)
    body.scale.set(0.093, 0.079, 0.20)
    const abdomen = new THREE.Mesh(moteGeometry, moteMaterial)
    abdomen.position.z = 0.11
    abdomen.scale.set(0.079, 0.067, 0.13)
    const glow = new THREE.Sprite(moteHaloMaterial)
    glow.position.z = 0.12
    const wings = [-1, 1].map(side => {
      const joint = new THREE.Group()
      const wing = new THREE.Mesh(moteGeometry, moteWingMaterial)
      wing.scale.set(0.15, 0.023, 0.078)
      wing.position.set(side * 0.12, 0.06, -0.03)
      joint.add(wing)
      return joint
    })
    view.add(body, abdomen, glow, ...wings)
    view.userData = { glow, wings }
    scene.add(view)
    return view
  }, (view, mote, index) => {
    const flutter = time / 620 + index * 1.7
    view.position.set(mote.x + Math.cos(flutter) * 0.12,
      mote.y + 0.77 + Math.sin(flutter) * 0.17, mote.z + Math.sin(flutter) * 0.12)
    view.rotation.y = flutter + Math.PI
    view.userData.glow.scale.setScalar(0.68 + Math.sin(flutter * 1.8) * 0.14)
    const flap = Math.sin(time / 26 + index) * 0.9
    view.userData.wings[0].rotation.z = flap
    view.userData.wings[1].rotation.z = -flap
  })

  syncActors(game.shades, shadeViews, makeGhost, ({ ghost, body, arms }, shade, index) => {
    ghost.position.set(shade.x, shade.y + Math.sin(time / 390 + index) * 0.16, shade.z)
    ghost.rotation.y = Math.atan2(shade.x - game.player.x, shade.z - game.player.z)
    body.material = shade.state === 'stunned' ? stunnedMaterial : shadeMaterial
    for (const [side, arm] of arms.entries()) {
      arm.material = body.material
      arm.rotation.z = Math.sin(time / 260 + index) * (side === 0 ? -0.25 : 0.25)
    }
  }, ({ ghost }) => ghost.removeFromParent())

  syncActors(game.drifters, drifterViews, () => {
    const silk = new THREE.Group()
    for (let index = 0; index < 4; index++) {
      const fold = new THREE.Mesh(drifterGeometry, drifterMaterial)
      fold.position.x = index * 0.51
      fold.scale.y = 1 - index * 0.16
      silk.add(fold)
    }
    scene.add(silk)
    return silk
  }, (view, drifter) => {
    view.position.set(drifter.x, drifter.y + 0.21 * Math.sin(time / 300), drifter.z)
    view.rotation.y = Math.atan2(game.player.x - drifter.x, game.player.z - drifter.z) + Math.PI / 2
    view.children.forEach((fold, index) => { fold.rotation.x = Math.sin(time / 135 + index) * 0.65 })
  })

  syncActors(game.charms, charmViews, () => {
    const view = new THREE.Group()
    view.add(new THREE.Mesh(charmBorder, charmBorderMaterial), new THREE.Mesh(charmGeometry, charmMaterial))
    scene.add(view)
    return view
  }, (view, charm) => {
    view.visible = charm.available
    view.position.set(charm.x, charm.y + 0.7, charm.z)
    view.rotation.y = time / 780
  })

  for (const lantern of game.lanterns) {
    const view = lanternViews.get(lantern.id)
    const low = lowFuel(lantern, tuning)
    const intensity = low ? 0.66 + 0.34 * Math.cos(game.simTick / 60 * 2 * Math.PI) : 1
    if (view.lit !== lantern.lit) {
      view.lit = lantern.lit
      view.bulb.scale.y = lantern.lit ? 1 : 0.8
      view.bulb.material.color.set(lantern.lit ? '#FFB347' : '#5B5F6E')
      view.bulb.material.emissive.set(lantern.lit ? '#FFB347' : '#000000')
      view.core.visible = lantern.lit
      if (lantern.lit) sceneryActors.add(view.light)
      else view.light.removeFromParent()
    }
    view.bulb.material.emissiveIntensity = 0.62 * intensity
    view.core.material.emissiveIntensity = intensity
    view.light.intensity = lantern.lit ? 64 * intensity : 0
    view.meter.visible = lantern.lit && intensity >= 0.49
    view.tear.visible = !lantern.lit
    if (lantern.lit) {
      const ratio = fuelOf(lantern) / tuning.fuel_max
      view.meter.quaternion.copy(camera.quaternion)
      view.fill.scale.x = ratio
      view.fill.position.x = (ratio - 1) * 1.17 / 2
      view.fill.material = low ? fuelLowMaterial : fuelFullMaterial
    } else {
      towardCamera.subVectors(camera.position, view.bulb.position).normalize()
      view.tear.position.copy(view.bulb.position).addScaledVector(towardCamera, 0.57)
      view.tear.quaternion.copy(camera.quaternion)
    }
  }
}

const motesHud = byId('motes')
const moteSlots = Array.from({ length: tuning.capacity_max }, () => document.createElement('span'))
const moteCount = document.createElement('strong')
moteCount.id = 'mote-count'
motesHud.replaceChildren(...moteSlots, moteCount)
const arrow = byId('arrow')
const arrowTarget = new THREE.Vector3()
const headingVector = new THREE.Vector3()
const viewPoint = new THREE.Vector3()
const hudText = (id, text) => {
  const element = byId(id)
  if (element.textContent !== text) element.textContent = text
}
function updateAbility(name, value, text, style) {
  const meter = byId(`${name}-meter`)
  meter.value = value
  const row = meter.parentElement
  row.classList.toggle('ready', style === 'ready')
  row.classList.toggle('shortage', style === 'shortage')
  hudText(`${name}-status`, text)
}

function updateHud() {
  const count = game.lanterns.filter(lantern => lantern.lit).length
  ambient.intensity = 0.15 + 0.55 * count / game.lanterns.length
  if (hud.hidden) return
  const { carried, flames, charmUntil, dashReady, dashUntil, pulseReady } = game.player
  const seconds = Math.ceil(timeLeft(game))
  hudText('flames', '🔥'.repeat(flames) + '○'.repeat(Math.max(0, tuning.flames - flames)))
  hudText('timer', `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`)
  byId('timer').classList.toggle('danger', seconds <= 30)
  const needed = Math.ceil(game.lanterns.length * tuning.win_ratio)
  hudText('score', `Đèn ${count}/${game.lanterns.length} · Cần ${needed} · ${game.score} điểm`)
  const max = capacity(game.player)
  moteSlots.forEach((slot, index) => {
    slot.hidden = index >= max
    slot.classList.toggle('full', index < carried)
  })
  moteCount.textContent = `${carried}/${max}`
  motesHud.setAttribute('aria-label', `Đom đóm ${carried}/${max}`)
  const tick = game.simTick
  const filling = (until, duration) => THREE.MathUtils.clamp(1 - (until - tick) / (duration * 60), 0, 1)
  const gliding = dashUntil > tick
  const dashCooling = dashReady > tick && charmUntil <= tick
  const pulseCooling = pulseReady > tick
  const missing = Math.max(0, tuning.pulse_cost - carried)
  const unavailable = game.state === 'paused' ? 'Tạm dừng'
    : game.state !== 'playing' ? 'Hết đêm' : game.player.respawnAt ? 'Đang hồi sinh' : ''

  const dashProgress = dashCooling ? filling(dashReady, tuning.dash_cooldown_s)
    : gliding ? filling(dashUntil, tuning.dash_duration_s) : 1
  const dashText = gliding ? 'Đang lướt' : dashCooling ? 'Hồi chiêu' : 'Sẵn sàng'
  updateAbility('dash', dashProgress, unavailable || dashText,
    !unavailable && !gliding && !dashCooling ? 'ready' : '')

  const pulseProgress = pulseCooling ? filling(pulseReady, tuning.pulse_cooldown_s)
    : Math.min(1, carried / tuning.pulse_cost)
  const pulseText = pulseCooling ? (missing ? `Hồi chiêu · Thiếu ${missing}` : 'Hồi chiêu')
    : missing ? `Thiếu ${missing} đom đóm` : 'Sẵn sàng'
  updateAbility('pulse', pulseProgress, unavailable || pulseText,
    unavailable || pulseCooling ? '' : missing ? 'shortage' : 'ready')
  const nearby = availableLantern(game, game.player)
  const interactKey = keyLabel(bindings.interact)
  const nearbyText = nearby?.lit
    ? `${interactKey} — Châm dầu (${Math.floor(fuelOf(nearby))}/${tuning.fuel_max})`
    : nearby ? `${interactKey} — Nạp ánh sáng (${nearby.deposited}/${lightCost(nearby, tuning)})` : ''
  hudText('hint', nearbyText || (game.wind.warning ? '⚠ Gió mạnh sắp đến' : ''))

  const spawned = spawnNotice?.until > tick ? game.shades.find(shade => shade.id === spawnNotice.id) : undefined
  const alerts = []
  if (spawned) alerts.push('Bóng Mực xuất hiện')
  if (game.wind.warning) alerts.push('Gió mạnh sắp thổi')
  if (seconds > 0 && seconds <= 10) alerts.push(`Bình minh sau ${seconds}`)
  const low = game.lanterns.filter(lantern => lowFuel(lantern, tuning)).map(lantern => lantern.id)
  if (low.length) alerts.push(`Đèn sắp cạn dầu: ${low.join(', ')}`)
  hudText('announcements', alerts.join(' · '))
  const shadeArrow = byId('shade-arrow')
  shadeArrow.hidden = !spawned
  if (spawned) {
    arrowTarget.set(spawned.x, spawned.y, spawned.z)
    viewPoint.copy(arrowTarget).project(camera)
    camera.getWorldDirection(headingVector)
    const direction = headingVector.dot(arrowTarget.sub(camera.position)) > 0 ? 1 : -1
    const x = direction * viewPoint.x || 0
    const y = direction * viewPoint.y || 0.001
    const scale = 0.86 / Math.max(Math.abs(x), Math.abs(y))
    shadeArrow.style.left = `${(1 + x * scale) * 50}%`
    shadeArrow.style.top = `${(1 - y * scale) * 50}%`
    shadeArrow.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(x, y)}rad)`
  }

  const target = nearestLantern(game, game.player, lantern => !lantern.lit)
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
  if (screen === 'play') advance(elapsed, cosine, sine)
  const position = game.player
  updatePlayer(time, elapsed, oldX, oldZ)
  const height = Math.max(-3, position.y)
  cameraHeight = settings.reducedMotion ? height : THREE.MathUtils.lerp(cameraHeight, height, 0.16)
  const cameraOffset = 14 * zoom
  camera.position.set(position.x + cameraOffset * sine, cameraHeight + 9 * zoom, position.z + cameraOffset * cosine)
  camera.lookAt(position.x - 2.5 * sine, cameraHeight + 1.45, position.z - 2.5 * cosine)
  camera.updateMatrixWorld()
  landscape.animate(time / 1000, camera, position, game.wind)
  updateActors(time)
  dashPuffs.update(game.simTick)
  updateHud()
  renderer.render(scene, camera)
}

loadNight(1)
menu()
renderer.setAnimationLoop(frame)
