import { defineConfig } from 'vite'
import { leaderboardPlugin } from './scripts/leaderboard-store.js'

export default defineConfig({
  base: './',
  plugins: [leaderboardPlugin()],
  build: { rollupOptions: { input: ['index.html', 'bench.html'] } },
})
