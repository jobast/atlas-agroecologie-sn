import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false, // we register manually from main.jsx via workbox-window
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Atlas des initiatives agroécologiques',
        short_name: 'Atlas Agro',
        description: 'Atlas interactif des initiatives agroécologiques au Sénégal — fonctionne hors-ligne pour la collecte terrain.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        lang: 'fr',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: {
        enabled: false, // keep dev server light; SW only in build
      },
    }),
  ],
});
