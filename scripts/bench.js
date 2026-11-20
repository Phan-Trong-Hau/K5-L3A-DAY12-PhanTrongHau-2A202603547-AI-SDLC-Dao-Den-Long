import { spawn } from 'node:child_process'
import { accessSync, constants, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir, type, release, arch } from 'node:os'
import { delimiter, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'

const launched = Date.now() - process.uptime() * 1000
const { values } = parseArgs({ options: {
  seed: { type: 'string' }, duration: { type: 'string' }, out: { type: 'string' },
} })
const seed = Number(values.seed)
const duration = Number(values.duration)
if (!Number.isSafeInteger(seed) || !Number.isFinite(duration) || duration <= 0 || !values.out) {
  console.error('Usage: node scripts/bench.js --seed 42 --duration 30 --out bench.json')
  process.exit(2)
}

function findBrowser() {
  const commands = ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']
  const candidates = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ...process.env.PATH.split(delimiter).flatMap(path => commands.map(command => join(path, command)))]
  const cache = join(homedir(), '.cache', 'ms-playwright')
  try {
    for (const folder of readdirSync(cache).reverse()) {
      if (folder.startsWith('chromium_headless_shell-')) {
        candidates.push(join(cache, folder, 'chrome-headless-shell-linux64', 'chrome-headless-shell'))
      } else if (folder.startsWith('chromium-')) {
        candidates.push(join(cache, folder, 'chrome-linux64', 'chrome'))
      }
    }
  } catch { /* The Chrome install may be on PATH. */ }
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch { /* Try the next location. */ }
  }
  throw new Error('Install Chromium or set CHROME_BIN to a Chrome executable.')
}

async function deadline(operation, milliseconds, message) {
  const until = Date.now() + milliseconds
  while (Date.now() < until) {
    const value = await operation()
    if (value) return value
    await delay(40)
  }
  throw new Error(message)
}

const { createServer } = await import('vite')
const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false } })
const profile = mkdtempSync(join(tmpdir(), 'dao-bench-'))
let browser
let socket
let firstFrame
let pageError
try {
  await server.listen()
  const url = `http://127.0.0.1:${server.httpServer.address().port}/bench.html?seed=${seed}&duration=${duration}`
  const binary = findBrowser()
  const headless = !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY || binary.includes('headless-shell')
  const software = process.env.DAO_BENCH_SOFTWARE === '1'
  const options = [
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1280,720',
    '--disable-frame-rate-limit', '--disable-gpu-vsync', '--enable-gpu',
    '--no-default-browser-check', '--disable-background-timer-throttling', 'about:blank',
  ]
  if (headless) options.unshift('--headless=new', '--ozone-platform=headless')
  if (process.platform === 'linux' && !software) options.unshift('--use-angle=gl')
  if (software) options.unshift('--use-angle=swiftshader', '--enable-unsafe-swiftshader')
  if (process.getuid?.() === 0) options.unshift('--no-sandbox')
  browser = spawn(binary, options, { stdio: 'ignore' })
  browser.on('error', error => { pageError = error.message })
  const port = await deadline(() => {
    if (pageError || browser.exitCode !== null) throw new Error(pageError || `Chrome exited ${browser.exitCode}`)
    try { return readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0] } catch { return null }
  }, 12000, 'Chrome debugging port unavailable')
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(tab => tab.type === 'page')
  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') pageError = message.params.exceptionDetails.exception?.description
    pending.get(message.id)?.(message)
    pending.delete(message.id)
  })
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id
    const timer = setTimeout(() => reject(new Error(`Chrome timed out on ${method}`)), 5000)
    pending.set(key, message => {
      clearTimeout(timer)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    })
    socket.send(JSON.stringify({ id: key, method, params }))
  })
  await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false })
  await call('Page.navigate', { url })
  const result = await deadline(async () => {
    if (pageError) throw new Error(pageError)
    const answer = await call('Runtime.evaluate', {
      expression: '({ error: window.benchError, first: window.benchFirstFrame, result: window.benchResult })', returnByValue: true,
    })
    const state = answer.result?.value
    if (state?.error) throw new Error(state.error)
    firstFrame ??= state?.first
    return state?.result
  }, 15000 + duration * 1000, 'Benchmark did not finish')
  const sorted = result.durations.filter(dt => dt > 0).sort((a, b) => a - b)
  if (!sorted.length || !firstFrame) throw new Error('No measured frames')
  const total = list => list.reduce((sum, dt) => sum + dt, 0)
  const round = number => Number(number.toFixed(2))
  const slow = sorted.slice(-Math.max(1, Math.ceil(sorted.length * 0.01)))
  const output = {
    contract_version: '1.3', avg_fps: round(1000 * sorted.length / total(sorted)),
    p1_low_fps: round(1000 * slow.length / total(slow)),
    frame_ms_p95: round(sorted[Math.ceil(sorted.length * 0.95) - 1]), frames: sorted.length,
    load_ms: Math.round(firstFrame - launched), peak_mem_mb: null, vsync_off: true,
    renderer: result.renderer, os: `${type()} ${release()} ${arch()}`,
  }
  writeFileSync(values.out, JSON.stringify(output, null, 2) + '\n')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  socket?.close()
  browser?.kill()
  await server.close()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* Chrome may still be exiting. */ }
}
