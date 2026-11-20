import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { readLeaderboard } from './leaderboard-store.js'

const { values } = parseArgs({ options: {
  'export-leaderboard': { type: 'string' }, host: { type: 'string' }, port: { type: 'string' },
  strictPort: { type: 'boolean' }, open: { type: 'boolean' },
} })
if (values['export-leaderboard']) {
  writeFileSync(values['export-leaderboard'], JSON.stringify(readLeaderboard(), null, 2) + '\n')
} else {
  const { createServer } = await import('vite')
  const server = await createServer({ server: {
    host: values.host ?? '127.0.0.1', port: values.port ? Number(values.port) : 5173,
    strictPort: values.strictPort ?? false, open: values.open ?? false,
  } })
  await server.listen()
  server.printUrls()
}
