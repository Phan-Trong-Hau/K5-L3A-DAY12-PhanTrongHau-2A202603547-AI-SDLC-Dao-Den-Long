import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { createGame, stepGame } from '../src/game.js'

const { values } = parseArgs({ options: {
  seed: { type: 'string' }, nights: { type: 'string' }, out: { type: 'string' },
} })
const seed = Number(values.seed)
const nights = Number(values.nights)
if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(nights) || nights < 1 || !values.out) {
  console.error('Usage: node --jitless --expose-gc scripts/soak.js --seed 7 --nights 10 --out soak.json')
  process.exit(2)
}
function memory() {
  globalThis.gc?.()
  return process.memoryUsage.rss() / (1024 * 1024)
}
function randomFor(initial) {
  let state = initial >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}
const started = performance.now()
let game = createGame(seed)
const mem_start_mb = memory()
const results = []
let crashes = 0
for (let index = 0; index < nights; index++) {
  const random = randomFor(seed + index)
  try {
    let x = 0
    let z = 0
    const ticks = game.duration * 60
    while (game.state === 'playing' && game.tick < ticks) {
      if (game.tick % 30 === 0) {
        const theta = random() * 2 * Math.PI
        x = Math.cos(theta)
        z = Math.sin(theta)
      }
      stepGame(game, { x, z, jump: random() < 0.05, dash: random() < 0.03,
        pulse: random() < 0.02, interact: random() < 0.10 })
    }
    results.push(game.state === 'won' ? 'won' : 'lost')
  } catch (error) {
    crashes++
    results.push('crashed')
    console.error(error)
  }
  game = createGame(seed + index + 1, {}, (index + 1) % 3 + 1)
}
const mem_end_mb = memory()
const duration_s = Number(((performance.now() - started) / 1000).toFixed(3))
writeFileSync(values.out, JSON.stringify({ nights, crashes, results, mem_start_mb, mem_end_mb, duration_s }, null, 2) + '\n')
