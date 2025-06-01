import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false, // Ignore certificate validation for self-signed certificates
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/static': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false // Ignore certificate validation for self-signed certificates
      },
      '/ws': {
        target: 'wss://localhost',
        ws: true,
        secure: false // Ignore certificate validation for self-signed certificates
      }
    }
  }
})
