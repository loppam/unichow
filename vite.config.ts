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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp3}'],
        cleanupOutdatedCaches: true,
        sourcemap: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }),
    {
      name: 'replace-env-vars',
      writeBundle() {
        const swPath = path.resolve(__dirname, 'dist/firebase-messaging-sw.js');
        const swContent = fs.readFileSync(swPath, 'utf-8');
        const replaced = swContent
          .replace('__VITE_FIREBASE_API_KEY__', process.env.VITE_FIREBASE_API_KEY || '')
          .replace('__VITE_FIREBASE_PROJECT_ID__', process.env.VITE_FIREBASE_PROJECT_ID || '')
          .replace('__VITE_FIREBASE_MESSAGING_SENDER_ID__', process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
          .replace('__VITE_FIREBASE_APP_ID__', process.env.VITE_FIREBASE_APP_ID || '')
          .replace('__VITE_FIREBASE_VAPID_PUBLIC_KEY__', process.env.VITE_FIREBASE_VAPID_PUBLIC_KEY || '');
        fs.writeFileSync(swPath, replaced);
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