import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: false, // Use public/manifest.json
      workbox: {
        // skipWaiting + clientsClaim: when a fresh service worker is published,
        // it activates immediately instead of waiting for every tab to close.
        // This is what prevents the "user saved their profile but the dashboard
        // shows the cached old build" + "old Quick Action labels still showing"
        // class of bugs after a deploy. The trade-off is that a tab may swap
        // its assets out from under the user — the AppShell is resilient to
        // that and re-fetches via the router on next navigation.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallbackDenylist: [/^\/admin/, /^\/api/, /^\/static/, /^\/media/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable in development
      }
    })
  ],
  css: {
    postcss: './postcss.config.js',
  },
})
