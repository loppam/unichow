// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'firebase-messaging-sw.ts',
      injectRegister: false,
      manifest: {
        name: 'UniChow Food Delivery',
        short_name: 'UniChow',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/whitefavicon192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/whitefavicon512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    headers: {
      'Service-Worker-Allowed': '/',
    },
  },
});
