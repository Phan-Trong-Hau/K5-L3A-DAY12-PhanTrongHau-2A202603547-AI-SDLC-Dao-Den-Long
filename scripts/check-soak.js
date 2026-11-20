import { readFileSync } from 'node:fs'

const result = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const growth = (result.mem_end_mb / result.mem_start_mb - 1) * 100
console.log(`Soak: ${result.nights} đêm, ${result.crashes} crash, RSS tăng ${growth.toFixed(2)}%.`)
if (result.nights !== 10 || result.results.length !== 10 || result.crashes !== 0 || !Number.isFinite(growth) || growth > 20) {
  process.exitCode = 1
}
