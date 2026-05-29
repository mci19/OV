/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Split vendor-libraries in eigen chunks zodat ze stabiel cachen
  // tussen deploys (browser hergebruikt onveranderde vendor-bundles).
  // De main app-chunk wordt ~250 KB i.p.v. ~620 KB.
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-pdf') || id.includes('@react-pdf')) return // → react-pdf.browser (al via dynamic import)
          if (id.includes('react-router')) return 'vendor-react'
          if (id.includes('react-dom') || /\/react\//.test(id)) return 'vendor-react'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('@dnd-kit')) return 'vendor-dnd'
          if (id.includes('lucide-react')) return 'vendor-lucide'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.svg'],
      manifest: {
        name: 'MY DOORS Bestelformulier',
        short_name: 'MY DOORS',
        description: 'Bestelformulier voor stalen binnendeuren — showroom-app voor verkopers',
        lang: 'nl-BE',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'landscape',
        theme_color: '#0A0A0A',
        background_color: '#FAFAF7',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icon-192.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'mydoors-html', expiration: { maxEntries: 8 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
})
