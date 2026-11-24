import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa'; // <-- 1. Importar el plugin

export default defineConfig({
  plugins: [
    react(),
    // 2. Configurar el plugin de PWA con exclusión para Cloudflare R2
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Excluir dominios de audio externos y Supabase del Service Worker para evitar bloqueos en Android
        navigateFallbackDenylist: [/^\/api/, /\/storage\/v1\/object/],
        runtimeCaching: [
          {
            // Evitar que Workbox intercepte los audios de Cloudflare R2
            urlPattern: /^https:\/\/.*\.(r2\.dev)\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Sanctify',
        short_name: 'Sanctify',
        theme_color: '#121214',
        background_color: '#121214',
        display: 'standalone',
        // Asegúrate de tener configurados tus iconos en public/
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    restoreMocks: true,
    clearMocks: true,
  },
});