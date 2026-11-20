import assert from 'node:assert/strict'
import { movePlayer, tickRate } from './simulation.js'

const position = { x: 0, z: 0 }
for (let tick = 0; tick < tickRate; tick++) {
  movePlayer(position, 0, 1)
}

const pos = [Number(position.x.toFixed(3)), 0, Number(position.z.toFixed(3))]
assert.deepEqual(pos, [0, 0, 6])
console.log(JSON.stringify({ ticks: tickRate, pos }))
