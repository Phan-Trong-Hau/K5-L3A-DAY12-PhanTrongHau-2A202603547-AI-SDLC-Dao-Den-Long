import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame, stepGame } from '../src/game.js'
import { createSceneryCollision } from '../demo/phase0/scenery-collision.js'

const empty = { random_motes: false, random_shades: false }
const tree = { x: 1, z: 0, base: 0, radius: 0.34, top: 4 }
const stone = { x: 1, z: 0, base: 0, radius: 0.42, top: 0.3, canStand: true }

test('Mây dừng trước thân cây khi lướt và trượt được dọc vật cản', () => {
  const collision = createSceneryCollision([tree])
  const game = createGame(1, empty)
  for (let tick = 0; tick < 12; tick++) stepGame(game, { x: 1, z: 0, dash: tick === 0 }, collision)
  assert.ok(game.player.x > 0.25 && game.player.x < 0.26)
  const slide = collision.slide({ x: 0, z: -0.2, y: 0 }, 2, 0.1)
  assert.ok(slide.z < -0.24)
  assert.ok(Math.hypot(slide.x - tree.x, slide.z - tree.z) >= 0.74)
})

test('Đá cản bước đi và có thể đáp lên mặt đá khi nhảy', () => {
  const collision = createSceneryCollision([stone])
  const walking = createGame(2, empty)
  for (let tick = 0; tick < 30; tick++) stepGame(walking, { x: 1, z: 0 }, collision)
  assert.ok(walking.player.x > 0.17 && walking.player.x < 0.18)

  const landing = createGame(2, { ...empty, player: { pos: [1, 0.6, 0] } })
  for (let tick = 0; tick < 30; tick++) stepGame(landing, { x: 0, z: 0 }, collision)
  assert.equal(landing.player.y, stone.top)
  assert.equal(landing.player.grounded, true)
})
