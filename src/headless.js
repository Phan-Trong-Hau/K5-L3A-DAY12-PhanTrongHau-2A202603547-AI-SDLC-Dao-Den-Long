import { readFileSync, openSync, writeSync, closeSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { createGame, snapshot, stepGame, tuning } from './game.js'

const flags = ['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every']
const buttons = ['jump', 'interact', 'pulse']
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const isNonnegative = value => Number.isFinite(value) && value >= 0
const isCount = value => Number.isSafeInteger(value) && value >= 0
const isBoolean = value => typeof value === 'boolean'
const isVector = (value, length) => Array.isArray(value) && value.length === length && value.every(Number.isFinite)
const isId = value => typeof value === 'string' && value.length > 0

function optionalFields(value, checks) {
  return isObject(value) && Object.entries(checks).every(([key, check]) =>
    !Object.hasOwn(value, key) || check(value[key]))
}

function listOf(check) {
  return value => Array.isArray(value) && value.every(check)
}

function uniqueIds(items) {
  const ids = (items ?? []).map(item => item.id).filter(id => id !== undefined)
  return ids.length === new Set(ids).size
}

function validateScenario(value) {
  const pos = value => isVector(value, 3)
  return optionalFields(value, {
    player: value => optionalFields(value, {
      pos, carried: value => isCount(value) && value <= tuning.carry_capacity, flames: isCount,
    }),
    random_motes: isBoolean, random_shades: isBoolean, time_left_s: isNonnegative,
    motes: listOf(pos),
    shades: listOf(shade => optionalFields(shade, { id: isId }) && pos(shade.pos)),
    lanterns: listOf(lantern => optionalFields(lantern, {
      pos, deposited: value => isCount(value) && value <= tuning.lantern_cost, lit: isBoolean,
    }) && /^L[1-5]$/.test(lantern.id)),
  }) && uniqueIds(value.lanterns) && uniqueIds(value.shades)
}

function validateInputs(value) {
  if (!isObject(value) || !Array.isArray(value.frames)) return false
  return value.frames.every((frame, index) => optionalFields(frame, {
    move: value => isVector(value, 2) && value.every(axis => Math.abs(axis) <= 1),
    cam_yaw_deg: Number.isFinite,
    ...Object.fromEntries(buttons.map(button => [button, isBoolean])),
  }) && isCount(frame.tick) && (index === 0 || frame.tick > value.frames[index - 1].tick))
}

function readFixture(path, validate) {
  try {
    const fixture = JSON.parse(readFileSync(path, 'utf8'))
    if (!validate(fixture)) throw new Error('invalid format')
    return fixture
  } catch (cause) {
    process.exitCode = 2
    throw new Error(`${path}: ${cause.message}`)
  }
}

function parseInteger(value, flag, minimum = -Infinity) {
  const number = Number(value)
  if (!/^[+-]?\d+$/.test(value ?? '') || !Number.isSafeInteger(number) || number < minimum) {
    throw new Error(`invalid --${flag}`)
  }
  return number
}

function run() {
  const args = process.argv.slice(2)
  // Allow a signed value such as "--seed -42" to be parsed as a value.
  const seedIndex = args.indexOf('--seed')
  if (seedIndex >= 0 && /^-\d+$/.test(args[seedIndex + 1] ?? '')) {
    args.splice(seedIndex, 2, `--seed=${args[seedIndex + 1]}`)
  }
  const { values } = parseArgs({
    args,
    options: Object.fromEntries(flags.map(flag => [flag, { type: 'string' }])),
  })
  const seed = parseInteger(values.seed, 'seed')
  const ticks = parseInteger(values.ticks, 'ticks', 0)
  const snapshotEvery = parseInteger(values['snapshot-every'] ?? '10', 'snapshot-every', 1)
  if (values.night !== '1' || !values.out) throw new Error('--night 1 and --out are required')

  const scenario = values.scenario ? readFixture(values.scenario, validateScenario) : {}
  const frames = values.inputs ? readFixture(values.inputs, validateInputs).frames : []
  const game = createGame(seed, scenario)
  const file = openSync(values.out, 'w')
  const write = record => writeSync(file, JSON.stringify(record) + '\n')
  let frameIndex = 0
  const controls = { move: [0, 0], cam_yaw_deg: 0 }

  try {
    write(snapshot(game))
    while (game.tick < ticks && game.state === 'playing') {
      const frame = frames[frameIndex]
      const edges = {}
      if (frame?.tick === game.tick) {
        for (const button of buttons) edges[button] = frame[button] === true && !controls[button]
        Object.assign(controls, frame)
        frameIndex++
      }

      const [x, z] = controls.move
      const yaw = (controls.cam_yaw_deg % 360) * Math.PI / 180
      const cosine = Math.cos(yaw)
      const sine = Math.sin(yaw)
      for (const event of stepGame(game, {
        x: x * cosine + z * sine,
        z: -x * sine + z * cosine,
        ...edges,
      })) write(event)
      if (game.tick % snapshotEvery === 0) write(snapshot(game))
    }
    write({ type: 'end', ticks: game.tick, state: game.state, score: game.score })
  } finally {
    closeSync(file)
  }
}

try {
  run()
} catch (error) {
  process.exitCode ||= 1
  console.error(error.message)
}
