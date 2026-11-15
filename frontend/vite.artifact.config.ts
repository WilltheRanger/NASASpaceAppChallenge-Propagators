// Build config for the comment page (direction D only): relative paths, one JS bundle, no public dir copy.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    outDir: process.env.ARTIFACT_OUT ?? 'dist-artifact',
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(__dirname, 'artifact-d.html'), output: { inlineDynamicImports: true, entryFileNames: 'assets/app.js', assetFileNames: 'assets/[name][extname]' } },
  },
})
