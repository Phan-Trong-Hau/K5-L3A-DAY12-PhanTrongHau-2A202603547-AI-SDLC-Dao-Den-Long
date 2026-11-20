import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { rank, validEntry } from '../src/leaderboard.js'

const path = process.env.DAO_LEADERBOARD_FILE ??
  join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'dao-den-long', 'leaderboard.json')

export function readLeaderboard() {
  try {
    const { entries } = JSON.parse(readFileSync(path, 'utf8'))
    return { entries: Array.isArray(entries) ? rank(entries) : [] }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { entries: [] }
  }
}

function saveEntry(entry) {
  const { entries } = readLeaderboard()
  const value = { entries: rank([...entries, entry]) }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path + '.tmp', JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
  renameSync(path + '.tmp', path)
  return value
}

export function leaderboardPlugin() {
  function install(server) {
    server.middlewares.use('/__dao/leaderboard', async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      try {
        if (req.method === 'GET') return res.end(JSON.stringify(readLeaderboard()))
        if (req.method !== 'POST' || !req.headers['content-type']?.startsWith('application/json')) {
          res.statusCode = 405
          return res.end('{}')
        }
        let body = ''
        for await (const chunk of req) {
          body += chunk
          if (body.length > 4096) break
        }
        let entry
        try { entry = JSON.parse(body) } catch { /* Respond below. */ }
        if (body.length > 4096 || !validEntry(entry)) {
          res.statusCode = 400
          return res.end('{}')
        }
        res.end(JSON.stringify(saveEntry(entry)))
      } catch (error) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: error.message }))
      }
    })
  }
  return { name: 'dao-local-leaderboard', configureServer: install, configurePreviewServer: install }
}
