import "./PWABadge.css";
import { registerSW } from "virtual:pwa-register";
import { useState, useEffect } from "react";

function PWABadge() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const updateSW = registerSW({
      onRegistered(registration) {
        // Check for updates more frequently
        setInterval(() => {
          registration?.update();
        }, 2 * 60 * 1000); // Every 2 minutes

        // Force immediate check
        registration?.update();
      },
      onNeedRefresh() {
        setNeedRefresh(true);
        // Clear all caches when update is available
        if ("caches" in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          });
        }
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      immediate: true,
    });

    // Force reload after 12 hours to ensure fresh content
    const forceReloadTimeout = setTimeout(() => {
      window.location.reload();
    }, 12 * 60 * 60 * 1000);

    return () => {
      updateSW?.();
      clearTimeout(forceReloadTimeout);
    };
  }, []);

  const reloadApp = () => {
    if (navigator.serviceWorker.controller) {
      // Skip waiting and reload immediately
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {needRefresh && (
        <div className="bg-white shadow-lg rounded-lg p-4 flex items-center gap-3">
          <span className="text-sm">New version available!</span>
          <button
            onClick={reloadApp}
            className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
          >
            Update Now
          </button>
        </div>
      )}
    </div>
  );
}

export default PWABadge;
