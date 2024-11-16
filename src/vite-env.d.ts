// vite-env.d.ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/info" />

// PWA Register types
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: any) => void;
  }

  export function registerSW(options?: RegisterSWOptions): () => void;
}

// PWA Info types
declare module 'virtual:pwa-info' {
  export interface PwaInfo {
    webManifest: { href: string; useCredentials: boolean; };
    registerSW: { registerPath: string; scope: string; };
    beforeInstallPrompt: boolean;
  }
  
  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: boolean;
    offlineReady: boolean;
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
  