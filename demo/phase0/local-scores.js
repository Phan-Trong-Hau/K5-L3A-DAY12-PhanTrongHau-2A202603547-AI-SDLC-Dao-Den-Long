import { rank } from '../../src/leaderboard.js'

const cache = 'dao-den-long-leaderboard'

async function request(entry) {
  let response
  try {
    response = await fetch('/__dao/leaderboard', entry ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry),
    } : undefined)
  } catch {
    return null
  }
  if (response.status === 404 || !response.headers.get('content-type')?.includes('application/json')) return null
  if (!response.ok) throw new Error(`Leaderboard HTTP ${response.status}`)
  return rank((await response.json()).entries)
}
function local() {
  try {
    const entries = JSON.parse(localStorage.getItem(cache))
    return Array.isArray(entries) ? rank(entries) : []
  } catch {
    return []
  }
}

export async function getScores() {
  return await request() ?? local()
}

export async function addScore(entry) {
  const remote = await request(entry)
  if (remote) return remote
  const entries = rank([...local(), entry])
  localStorage.setItem(cache, JSON.stringify(entries))
  return entries
}

export function downloadScores(entries) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ entries }, null, 2) + '\n'], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'leaderboard.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
