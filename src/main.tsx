import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";

// Register service worker
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Service worker has new content
      console.log('New content available')
    },
    onOfflineReady() {
      // Service worker is ready for offline use
      console.log('App ready for offline use')
    },
    onRegistered(registration) {
      // Check for updates periodically
      setInterval(() => {
        registration?.update()
      }, 60 * 60 * 1000) // Check every hour
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error)
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
