import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const empty = { random_motes: false, random_shades: false, random_drifters: false }

function run(t, { night, scenario, frames = [], ticks }) {
  const dir = mkdtempSync(join(tmpdir(), 'dao-contract-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const scenarioFile = join(dir, 'scenario.json')
  const inputs = join(dir, 'inputs.json')
  const out = join(dir, 'out.jsonl')
  writeFileSync(scenarioFile, JSON.stringify({ ...empty, ...scenario }))
  writeFileSync(inputs, JSON.stringify({ frames }))
  const result = spawnSync(process.execPath, ['src/headless.js', '--night', String(night), '--seed', '17',
    '--scenario', scenarioFile, '--inputs', inputs, '--ticks', String(ticks), '--out', out,
    '--snapshot-every', '1'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const records = readFileSync(out, 'utf8').trim().split('\n').map(line => JSON.parse(line))
  return {
    snapshots: records.filter(record => record.type === 'snapshot'),
    events: records.filter(record => record.type === 'event'),
    end: records.at(-1),
  }
}

test('Contract v1.1 nhận Đêm 2, Bùa Gió, lướt và pause từ JSON', t => {
  const { snapshots, events, end } = run(t, {
    night: 2, ticks: 25, scenario: { player: { pos: [35, 0, 0] }, charms: [{ id: 'C1' }] },
    frames: [
      { tick: 1, dash: true, move: [1, 0] },
      { tick: 2, pause: true },
      { tick: 3, pause: false },
      { tick: 8, pause: true, move: [0, 0] },
      { tick: 21, dash: false },
      { tick: 22, dash: true },
    ],
  })
  assert.equal(snapshots[0].night, 2)
  assert.equal(snapshots[0].lanterns.length, 6)
  assert.deepEqual(events.filter(event => ['night_start', 'charm_picked', 'dash', 'paused', 'resumed']
    .includes(event.name)).map(event => [event.tick, event.name]),
  [[0, 'night_start'], [1, 'charm_picked'], [2, 'dash'], [3, 'paused'], [9, 'resumed'], [23, 'dash']])
  assert.equal(snapshots[8].state, 'paused')
  assert.equal(snapshots[8].sim_tick, 2)
  assert.equal(snapshots[25].sim_tick, 19)
  assert.equal(end.ticks, 25)
})

test('Contract v1.1 nhận Đêm 3, Gió Lạc được gieo từ scenario và thả đồ khi pulse', t => {
  const { snapshots, events } = run(t, {
    night: 3, ticks: 5,
    scenario: { player: { carried: 8, invuln_ticks: 91 }, drifters: [{ id: 'D5', pos: [1, 0.8, 0] }],
      wind_enabled: false, charms: [] },
    frames: [{ tick: 1, pulse: true }],
  })
  assert.equal(snapshots[0].lanterns.length, 7)
  assert.deepEqual(snapshots[0].charms, [])
  assert.equal(snapshots[0].player.invuln, true)
  assert.deepEqual(events.find(event => event.name === 'drifter_steal')?.data, { drifter_id: 'D5', amount: 3, carried: 5 })
  assert.deepEqual(events.find(event => event.name === 'drifter_drop')?.data, { drifter_id: 'D5', amount: 3 })
  assert.equal(snapshots[2].motes.filter(mote => mote.kind === 'dropped' && mote.ttl_s === 8).length, 3)
  assert.equal(snapshots[5].wind.active, false)
})
