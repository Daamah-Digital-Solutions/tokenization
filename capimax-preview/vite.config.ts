import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' surfaces the update via useRegisterSW().needRefresh so we
      // can show the user a "Reload now" banner (see UpdatePrompt.tsx).
      // 'autoUpdate' alone doesn't help here: the new SW activates, but the
      // already-loaded tab keeps running the OLD precached JS until a
      // navigation reload — so users would still see the bugs we just
      // fixed. With 'prompt' the banner forces (or auto-times-out) a
      // reload, which is the only way to swap in the new chunks.
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'robots.txt',
        'icons/*.png',
        'splash/*.png',
      ],
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
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2,webmanifest}', 'icons/*.png'],
        // Splash screens are referenced by `<link rel="apple-touch-startup-image">`
        // and only ever fetched by iOS at install time, not by the running PWA —
        // no reason to pay the precache cost for 2 MB of PNGs we don't use at
        // runtime. They'll still be served by the network at install time.
        globIgnores: ['splash/*'],
        // Stay generous on the budget anyway in case future fonts or chunks
        // push individual files past the default 2 MB limit.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
