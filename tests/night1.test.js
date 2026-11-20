import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { createGame, snapshot, stepGame, tuning } from '../src/game.js'

const empty = { random_motes: false, random_shades: false }
const step = (game, input = {}) => stepGame(game, { x: 0, z: 0, ...input })

test('Đêm 1 có đủ năm đèn và tài nguyên', () => {
  const game = createGame(1)
  assert.equal(game.lanterns.length, 5)
  assert.equal(game.lanterns.filter(lantern => lantern.lit).length, 0)
  assert.equal(game.player.flames, tuning.flames)
  assert.equal(game.motes.length, 20)
  assert.equal(new Set(game.motes.map(mote => `${mote.x},${mote.z}`)).size, 20)
  assert.deepEqual(game.lanterns.map(({ x, y, z }) => [x, y, z]), [
    [0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7],
  ])
  assert.equal(game.shades.length, 0)
})

test('nhảy, gom đom đóm ở biên bán kính, nạp đủ năm đèn và thắng', () => {
  const game = createGame(1, { ...empty, motes: [[1, 0, 0], [1.01, 0, 0]] })
  assert.deepEqual(step(game, { jump: true }).map(event => event.name), ['mote_picked'])
  assert.ok(game.player.y > 0)
  assert.equal(game.player.carried, 1)
  for (const lantern of game.lanterns) {
    Object.assign(game.player, { x: lantern.x, z: lantern.z, carried: tuning.lantern_cost })
    const events = step(game, { interact: true })
    assert.deepEqual(events.slice(0, 2).map(event => event.name), ['deposit', 'lantern_lit'])
  }
  assert.equal(game.state, 'won')
  assert.equal(game.player.carried, 0)
})

test('xung sáng tiêu hao đom đóm, đẩy và làm choáng Bóng Mực', () => {
  const game = createGame(1, { ...empty, player: { carried: 4 }, shades: [{ id: 'B1', pos: [4, 0, 0] }] })
  assert.deepEqual(step(game, { pulse: true }), [
    { type: 'event', tick: 1, name: 'pulse', data: { stunned_ids: ['B1'] } },
  ])
  assert.equal(game.player.carried, 1)
  assert.deepEqual(step(game, { pulse: true }), [])
  for (let index = 2; index < 15; index++) step(game)
  assert.deepEqual(snapshot(game).shades, [{ id: 'B1', pos: [8, 0, 0], state: 'stunned' }])
})

test('đèn sáng che chở Mây, hết lửa hoặc hết giờ thì thua', () => {
  const shade = { pos: [0.5, 0, 0] }
  const safe = createGame(1, { ...empty, lanterns: [{ id: 'L1', lit: true, pos: [0, 0, 0] }], shades: [shade] })
  assert.deepEqual(step(safe), [])
  assert.equal(safe.player.flames, tuning.flames)

  const hit = createGame(1, { ...empty, player: { flames: 1 }, shades: [shade] })
  assert.deepEqual(step(hit).map(event => event.name), ['player_hit', 'game_over'])
  assert.equal(hit.state, 'lost')
  const dawn = createGame(1, { ...empty, time_left_s: 1 / 60 })
  assert.equal(step(dawn).at(-1).data.reason, 'dawn')
})

test('CLI v1.1 ghi snapshot, áp dụng yaw và input giữ nguyên, chạy tất định và báo input lỗi', t => {
  const dir = mkdtempSync(join(tmpdir(), 'dao-den-long-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const scenario = join(dir, 'scenario.json')
  const inputs = join(dir, 'inputs.json')
  const out = join(dir, 'out.jsonl')
  writeFileSync(scenario, JSON.stringify(empty))
  writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }, { tick: 20 }] }))
  const run = () => spawnSync(process.execPath, [
    'src/headless.js', '--seed', '-7', '--night', '1', '--ticks', '60',
    '--scenario', scenario, '--inputs', inputs, '--out', out, '--snapshot-every', '60',
  ], { encoding: 'utf8' })
  const first = run()
  assert.equal(first.status, 0, first.stderr)
  const output = readFileSync(out, 'utf8')
  const [initial, start, final, end] = output.trim().split('\n').map(line => JSON.parse(line))
  assert.equal(initial.tick, 0)
  assert.deepEqual(start, { type: 'event', tick: 0, name: 'night_start', data: { night: 1 } })
  assert.deepEqual(final.player.pos, [6, 0, 0])
  assert.deepEqual(end, { type: 'end', ticks: 60, state: 'playing', score: 0 })
  assert.equal(run().status, 0)
  assert.equal(readFileSync(out, 'utf8'), output)

  writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0 }, { tick: 0 }] }))
  const bad = run()
  assert.equal(bad.status, 2)
  assert.match(bad.stderr, /invalid format/)
})
