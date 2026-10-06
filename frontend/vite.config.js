import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), tailwindcss()],
    cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_API_TARGET || env.VITE_API_TARGET || 'http://localhost:3001',
          changeOrigin: true
        }
      },
      allowedHosts: ['come-handheld-pennsylvania-containing.trycloudflare.com']
    }
  }
})
