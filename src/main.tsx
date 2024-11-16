import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker
if ('serviceWorker' in navigator) {
  try {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js', {
        scope: '/',
        type: 'module'
      })
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  } catch (error) {
    console.error('Service Worker registration error:', error);
  }
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
