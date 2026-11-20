import assert from 'node:assert/strict'
import { test } from 'node:test'
import { availableLantern, createGame, snapshot, stepGame } from '../src/game.js'

const empty = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false }
const step = (game, input = {}) => stepGame(game, { x: 0, z: 0, ...input })
const wait = (game, ticks) => Array.from({ length: ticks }, () => step(game)).flat()
const lamp = (game, index = 0) => snapshot(game).lanterns[index]

test('Dầu cạn đúng tick, đặt sẵn không tăng sức chứa, thắp lại tốn năm và cộng 40 điểm', () => {
  const game = createGame(1, { ...empty, player: { carried: 7 },
    lanterns: [{ id: 'L1', lit: true, pos: [0, 0, 0], fuel: 0.1 }] })
  assert.equal(snapshot(game).player.capacity, 10)
  wait(game, 5)
  assert.equal(lamp(game).lit, true)
  const events = step(game, { interact: true })
  assert.deepEqual(events.map(event => [event.name, event.data]), [
    ['lantern_out', { lantern_id: 'L1' }],
    ['deposit', { lantern_id: 'L1', amount: 5, deposited: 5 }],
    ['lantern_lit', { lantern_id: 'L1', relight: true }],
  ])
  assert.deepEqual(lamp(game), {
    id: 'L1', pos: [0, 0, 0], lit: true, deposited: 5, fuel: 100, ever_lit: true, relit_count: 1,
  })
  assert.equal(snapshot(game).player.capacity, 12)
  assert.equal(game.player.carried, 2)
  assert.equal(game.score, 65)
})

test('Châm dầu chọn đèn gần nhất có thể nhận, làm tròn số đom đóm lên và giới hạn 100', () => {
  const game = createGame(2, { ...empty, player: { carried: 5 }, lanterns: [
    { id: 'L1', pos: [0, 0, 0], lit: true },
    { id: 'L2', pos: [1, 0, 0], lit: true, fuel: 70 },
    { id: 'L3', pos: [-1, 0, 0], lit: true, fuel: 70 },
  ] })
  assert.equal(availableLantern(game, game.player).id, 'L2')
  game.player.x = -1
  assert.deepEqual(step(game, { interact: true }).map(event => event.data), [{ lantern_id: 'L3', amount: 4, fuel: 100 }])
  assert.equal(game.score, 20)
  assert.equal(game.player.carried, 1)
  assert.equal(snapshot(game).player.capacity, 10)
})

test('Sức chứa lấy theo số lần thắp, có trần 20 và áp dụng cho nhặt tự động', () => {
  const game = createGame(3, { ...empty, player: { carried: 19, successful_lights: 9 },
    motes: [[0, 0, 0], [0.1, 0, 0]] })
  step(game)
  assert.equal(snapshot(game).player.capacity, 20)
  assert.equal(game.player.carried, 20)
  assert.equal(game.motes.length, 1)
  assert.equal(snapshot(createGame(3, empty, 2)).player.capacity, 10)
})

test('Hai Bóng Mực hút cộng dồn, báo lần đầu sau 60 tick hút và dừng khi Mây tiến vào', () => {
  const game = createGame(4, { ...empty, player: { pos: [20, 0, 0] },
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 25 }],
    shades: [{ pos: [1, 0.8, 0] }, { pos: [0, 0.8, 1] }],
  })
  step(game)
  assert.ok(game.shades.every(shade => shade.state === 'drain'))
  assert.equal(wait(game, 59).length, 0)
  assert.deepEqual(step(game).map(event => event.data), [
    { lantern_id: 'L1', shade_id: 'S1', fuel: 14 },
    { lantern_id: 'L1', shade_id: 'S2', fuel: 14 },
  ])
  game.player.x = 5
  step(game)
  assert.ok(game.shades.every(shade => shade.state === 'chase'))
})

test('Tỏa sáng ngắt hút và cộng 15 điểm cho Bóng đang hút, 5 cho Bóng khác', () => {
  const game = createGame(5, { ...empty, player: { carried: 3 }, lanterns: [
    { id: 'L1', pos: [3, 0, 0], lit: true, fuel: 20 },
  ], shades: [
    { pos: [4, 0.8, 0], state: 'drain', target_lantern_id: 'L1' },
    { pos: [-3, 0.8, 0], state: 'chase' },
  ] })
  assert.deepEqual(step(game, { pulse: true })[0].data.stunned_ids, ['S1', 'S2'])
  assert.equal(game.score, 20)
  assert.ok(game.shades.every(shade => shade.state === 'stunned'))
  wait(game, 120)
  assert.ok(game.shades.every(shade => shade.state === 'wander'))
})

test('Châm dầu đúng 30 khôi phục an toàn và đẩy Bóng Mực sát bờ L6 ra mép trong 30 tick', () => {
  const game = createGame(6, { ...empty, player: { pos: [20, 0, -35], carried: 1 },
    lanterns: [{ id: 'L6', lit: true, fuel: 20.1 }],
    shades: [{ pos: [20, 0.8, -36], state: 'drain', target_lantern_id: 'L6' }],
  }, 3)
  const events = step(game, { interact: true })
  assert.deepEqual(events[0].data, { lantern_id: 'L6', amount: 1, fuel: 30 })
  assert.equal(game.lanterns[5].fuelTicks, 30 * 60)
  // Keep it lit above the threshold for the remainder of the ejection.
  game.player.carried = 1
  step(game, { interact: true })
  wait(game, 28)
  const shade = game.shades[0]
  assert.ok(Math.hypot(shade.x - 20, shade.z + 35) >= 6 - 1e-7)
  assert.ok(Math.hypot(shade.x, shade.z) <= 45)
  assert.equal(game.player.flames, 3)
})

test('Bình minh dùng ngưỡng 3/5, 4/6, 5/7 và bỏ qua đèn vừa tắt hoặc khi hết lửa', () => {
  for (const [night, needed] of [[1, 3], [2, 4], [3, 5]]) {
    const lit = Array.from({ length: needed }, (_, i) => ({ id: `L${i + 1}`, lit: true, fuel: 50 }))
    const run = (options = {}) => createGame(7, { ...empty, time_left_s: 1 / 60, lanterns: lit, ...options }, night)
    const won = run()
    assert.equal(step(won).at(-1).data.reason, 'dawn_survived')
    assert.equal(won.score, needed * 99 + 150)
    const extinguished = run({ lanterns: lit.map((light, i) => i ? light : { ...light, fuel: 1 / 60 }) })
    assert.deepEqual(step(extinguished).map(event => event.name), ['lantern_out', 'game_over'])
    assert.equal(extinguished.state, 'lost')
    const dead = run({ player: { flames: 0 } })
    assert.equal(step(dead).at(-1).data.reason, 'no_flames')
    assert.equal(dead.score, 0)
  }
})
