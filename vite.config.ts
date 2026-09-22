import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Le preview Vercel utilise un hostname dynamique relayé vers le serveur Vite.
  // Sans cette autorisation, Vite renvoie une page d’erreur avant de charger React.
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    // Jamais de source map en production : les `.map` publient le code source
    // intégral sur un CDN public (donc tout littéral qu'il contient).
    // Elles ne sont générées qu'en mode développement explicite.
    sourcemap: mode === 'development',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation': ['framer-motion'],
        },
      },
    },
  },
}))
