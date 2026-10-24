import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const certDir = path.resolve(__dirname, '.cert')
const keyPath = path.join(certDir, 'localhost.key')
const certPath = path.join(certDir, 'localhost.pem')
const hasHttpsCert = fs.existsSync(keyPath) && fs.existsSync(certPath)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    https: hasHttpsCert
      ? {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      : undefined,
    proxy: {
      '/api': {
        target: 'https://localhost:7050',
        changeOrigin: true,
        secure: false,
      },
      '/Images': {
        target: 'https://localhost:7050',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'https://localhost:7050',
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
})
