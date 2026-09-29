import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/, set via VITE_BASE in CI.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
