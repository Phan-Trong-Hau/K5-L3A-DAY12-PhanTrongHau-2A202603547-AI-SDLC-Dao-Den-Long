import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame, snapshot, stepGame } from '../src/game.js'

const empty = { random_motes: false, random_shades: false, random_drifters: false }
const step = (game, input = {}) => stepGame(game, { x: 0, z: 0, ...input })
const advance = (game, ticks, input) => {
  const events = []
  for (let index = 0; index < ticks; index++) events.push(...step(game, input))
  return events
}

test('Lướt 12 tick theo hướng đã chốt, giữ cao độ và có hồi chiêu', () => {
  const game = createGame(1, empty)
  step(game, { jump: true })
  const altitude = game.player.y
  assert.deepEqual(step(game, { dash: true, x: 1 }).map(event => event.name), ['dash'])
  advance(game, 11, { z: 1 })
  assert.equal(snapshot(game).player.pos[0], 2.8)
  assert.equal(game.player.y, altitude)
  assert.equal(step(game, { dash: true }).some(event => event.name === 'dash'), false)
  assert.notEqual(game.player.y, altitude)
})

test('Pause giữ nguyên đồng hồ và các bộ đếm cho đến resume', () => {
  const game = createGame(2, { ...empty, player: { pulse_cd_ticks: 180, charm_ticks: 600 } }, 2)
  const initial = snapshot(game)
  assert.equal(step(game, { pause: true })[0].name, 'paused')
  advance(game, 240, { x: 1 })
  const paused = snapshot(game)
  assert.equal(paused.tick, 241)
  assert.equal(paused.sim_tick, 0)
  assert.equal(paused.state, 'paused')
  assert.deepEqual(paused.player, initial.player)
  assert.equal(paused.time_left_s, initial.time_left_s)
  assert.equal(step(game, { pause: true })[0].name, 'resumed')
  assert.equal(snapshot(game).sim_tick, 1)
})

test('Rơi tốn một lửa, bỏ qua miễn nhiễm và hồi sinh đúng sau 60 tick', () => {
  const game = createGame(3, { ...empty, player: { pos: [41, -10.1, 0], carried: 7, invuln_ticks: 100 } })
  assert.deepEqual(step(game)[0].data, { by: 'fall', flames: 2, dropped: 0, lost: 7 })
  assert.deepEqual(advance(game, 59), [])
  assert.ok(game.player.y < -10)
  step(game)
  assert.deepEqual(snapshot(game).player.pos, [0, 0, 0])
  assert.equal(snapshot(game).player.invuln, true)
  assert.equal(game.player.carried, 0)
})

test('Cầu tre và bục nhảy Đảo Cau tới đảo bên phải', () => {
  const bridge = createGame(5, { ...empty, player: { pos: [26, 0, 0] } }, 2)
  advance(bridge, 200, { x: 1 })
  assert.equal(snapshot(bridge).player.pos[0], 48.4)
  assert.equal(bridge.player.grounded, true)

  const pad = createGame(5, { ...empty, player: { pos: [20, 0, 18] } }, 2)
  step(pad)
  assert.equal(pad.player.vy, 14)
  advance(pad, 85, { x: -1 })
  assert.ok(pad.player.x > 50)
  assert.equal(pad.player.grounded, true)
})

test('Đảo Chuông lên tầng giữa qua dốc, lên tầng trên qua bục và có gió theo lịch', () => {
  const angle = Math.PI / 6
  const game = createGame(1, { ...empty, player: { pos: [30 * Math.cos(angle), 0, 15] } }, 3)
  advance(game, 65, { x: -Math.cos(angle), z: -0.5 })
  assert.equal(snapshot(game).player.pos[1], 3)

  const pad = createGame(1, { ...empty, player: { pos: [0, 3, 13] } }, 3)
  step(pad)
  advance(pad, 74)
  assert.equal(snapshot(pad).player.pos[1], 6)
  assert.equal(pad.player.grounded, true)
  const wind = createGame(2, empty, 3)
  advance(wind, 1680)
  assert.equal(wind.wind.warning, true)
  advance(wind, 120)
  assert.equal(wind.wind.active, true)
  assert.equal(Math.round(Math.hypot(wind.player.vx, wind.player.vz)), 2)
  advance(wind, 300)
  assert.equal(wind.wind.active, false)
})

test('Gió Lạc cướp trước Bóng Mực và thả đồ khi trúng Tỏa Sáng', () => {
  const game = createGame(3, { ...empty, player: { carried: 9 },
    drifters: [{ pos: [0.5, 0.8, 0] }], shades: [{ pos: [0.2, 0.8, 0] }] }, 2)
  assert.deepEqual(step(game).map(event => event.name), ['drifter_steal', 'player_hit'])
  assert.equal(game.player.carried, 3)
  assert.equal(game.drifters[0].stolen, 3)
  assert.equal(game.motes.length, 3)
  assert.deepEqual(step(game, { pulse: true }).map(event => event.name), ['pulse', 'drifter_drop'])
  assert.equal(game.drifters[0].stolen, 0)
  assert.equal(game.motes.length, 6)
  assert.ok(game.motes.every(mote => mote.kind === 'dropped'))
  advance(game, 120)
  assert.equal(game.drifters.length, 0)
})

test('Bùa Gió đặt trên cầu, đổi tốc độ, bỏ hồi chiêu và hồi lại đúng lịch', () => {
  const game = createGame(7, { ...empty, player: { pos: [35, 0, 0], dash_cd_ticks: 90 } }, 2)
  assert.equal(step(game)[0].name, 'charm_picked')
  step(game, { x: 1 })
  assert.equal(game.player.vx, 7.2)
  assert.equal(step(game, { dash: true, x: 1 })[0].name, 'dash')
  advance(game, 11)
  assert.equal(step(game, { dash: true })[0].name, 'dash')
  advance(game, 600)
  assert.equal(snapshot(game).player.charm_s, 0)
  advance(game, 2701 - game.simTick)
  assert.equal(game.charms[0].available, true)
})

test('Lịch sinh và vùng an toàn đúng mốc', () => {
  const game = createGame(7, { random_drifters: false })
  advance(game, 239)
  assert.equal(game.motes.length, 20)
  step(game)
  assert.equal(game.motes.length, 21)
  assert.deepEqual(advance(game, 60).filter(event => event.name === 'shade_spawned').map(event => event.data.id), ['S1', 'S2'])
  assert.deepEqual(game.shades.map(shade => shade.state), ['spawning', 'spawning'])
  const safe = createGame(7, { ...empty, player: { carried: 10 },
    lanterns: [{ id: 'L1', pos: [0, 0, 0] }], shades: [{ pos: [2, 0.8, 0] }] })
  step(safe, { interact: true })
  advance(safe, 29)
  assert.ok(Math.hypot(safe.shades[0].x, safe.shades[0].z) >= 6 - 1e-6)
  assert.equal(safe.player.flames, 3)
})

test('Nạp đèn chấm điểm và thắng tại tick hết giờ khi vẫn còn lửa', () => {
  const game = createGame(8, { ...empty, player: { carried: 2 }, time_left_s: 1 / 60,
    lanterns: [1, 2, 3, 4].map(i => ({ id: `L${i}`, lit: true })).concat([
      { id: 'L5', pos: [0, 0, 0], deposited: 9 },
    ]) })
  assert.equal(step(game, { interact: true }).at(-1).data.reason, 'all_lit')
  assert.equal(game.score, 10 + 100 + 50 * 3)
})
