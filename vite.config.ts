/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
