import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const directory = mkdtempSync(join(tmpdir(), 'dao-verify-'))
const soak = join(directory, 'soak.json')
const npm = process.env.npm_execpath
const steps = [
  [npm, 'test'],
  [npm, 'run', 'build'],
  ['--jitless', '--expose-gc', 'scripts/soak.js', '--seed', '7', '--nights', '10', '--out', soak],
  ['scripts/check-soak.js', soak],
]
try {
  for (const args of steps) {
    const result = spawnSync(process.execPath, args, { stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1
      break
    }
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
