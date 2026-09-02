import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tale Dives is a client-only SPA (Blueprint §1.1) — no server, no backend.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
