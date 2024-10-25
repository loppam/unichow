// vite-env.d.ts
declare module 'virtual:pwa-register/react' {
    import { RegisterSWOptions } from 'vite-plugin-pwa';
  
    export function useRegisterSW(options?: RegisterSWOptions): {
      needRefresh: boolean;
      offlineReady: boolean;
      updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
    };
  }
  