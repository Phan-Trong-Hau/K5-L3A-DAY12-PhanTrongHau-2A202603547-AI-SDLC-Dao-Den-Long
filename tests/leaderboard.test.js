import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rank, validName } from '../src/leaderboard.js'

test('Bảng xếp hạng lọc tên sai, giữ top 10 và ưu tiên người đạt trước khi bằng điểm', () => {
  const entry = (name, score, achieved_at) => ({ name, score, achieved_at, seed: 42, nights_won: 1 })
  const older = entry('MAY_01', 99, '2026-01-01T09:00:00+07:00')
  const newer = entry('MAY_02', 99, '2026-01-01T02:15:00Z')
  const ranked = rank([newer, older, entry('x!', 200, '2026-01-01T00:00:00Z'),
    ...Array.from({ length: 10 }, (_, index) => entry(`Player${index}`, index, '2026-01-01T02:00:00Z'))])
  assert.deepEqual(ranked.slice(0, 2), [older, newer])
  assert.equal(ranked.length, 10)
  assert.ok(validName('A_1'))
  assert.ok(!validName('ABCDEFGHIJKLM'))
})
