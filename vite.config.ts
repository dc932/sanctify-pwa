import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Sanctify_Icon_black.png', 'Sanctify_Icon_white.png'],
      manifest: {
        name: 'Sanctify',
        short_name: 'Sanctify',
        description: 'Tu vida espiritual sonorizada',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0A0B',
        theme_color: '#3CC8F5',
        icons: [
          {
            src: '/Sanctify_Icon_black.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/functions\//, /\.r2\.dev\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sanctify-interface',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'sanctify-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // NOTA: Se eliminó la regla de caché de audio. 
          // Los audios de Cloudflare R2 ahora van directo a la red (NetworkOnly) 
          // evitando por completo el error de códigos 206 (Partial Content).
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/audio-api': {
        target: 'https://pub-695900c697294aa4226981fxv90m.r2.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/audio-api/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['wavesurfer.js', 'recharts', 'cropperjs'],
  },
});