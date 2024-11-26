// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        cleanupOutdatedCaches: true,
        sourcemap: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-cache'
            }
          },
          {
            urlPattern: /^https:\/\/fcm\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fcm-cache'
            }
          },
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-apis-cache'
            }
          }
        ],
        additionalManifestEntries: [
          { url: '/firebase-config.json', revision: Date.now().toString() }
        ]
      },
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
        ]
      }
    }),
    {
      name: 'replace-env-vars',
      writeBundle() {
        const configPath = path.resolve(__dirname, 'dist/firebase-config.json');
        const config = fs.readFileSync(configPath, 'utf-8');
        const replaced = config
          .replace('__VITE_FIREBASE_API_KEY__', process.env.VITE_FIREBASE_API_KEY || '')
          .replace('__VITE_FIREBASE_PROJECT_ID__', process.env.VITE_FIREBASE_PROJECT_ID || '')
          .replace('__VITE_FIREBASE_MESSAGING_SENDER_ID__', process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
          .replace('__VITE_FIREBASE_APP_ID__', process.env.VITE_FIREBASE_APP_ID || '');
        fs.writeFileSync(configPath, replaced);
      }
    }
  ],
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name].[hash][extname]';
          
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return 'assets/[name].[hash][extname]';
          }
          
          return 'assets/[name].[hash][extname]';
        }
      }
    }
  },
  publicDir: 'public',
  server: {
    fs: {
      strict: true,
    }
  }
});

