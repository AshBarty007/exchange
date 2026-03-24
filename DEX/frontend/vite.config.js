import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
    proxy: {
      '/api/users': 'http://localhost:5001',
      '/api/assets': 'http://localhost:5002',
      '/api/orders': 'http://localhost:8081',
      '/api/blockchain': 'http://localhost:8082',
      '/api/nodes': 'http://localhost:8082',
      '/api/settlement': 'http://localhost:8083',
    }
  }
})
