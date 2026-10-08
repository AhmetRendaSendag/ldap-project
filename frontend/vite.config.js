import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/Print_Log': 'http://localhost:8000',
    },
  },
})
