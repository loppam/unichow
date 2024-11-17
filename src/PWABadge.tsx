import './PWABadge.css'
import { registerSW } from 'virtual:pwa-register'
import { useState, useEffect } from 'react'

function PWABadge() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    const updateSW = registerSW({
      onRegistered(registration) {
        // Check for updates every 5 minutes
        setInterval(() => {
          registration?.update()
        }, 5 * 60 * 1000)
      },
      onRegisterError(error) {
        console.error('SW registration error', error)
      },
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onOfflineReady() {
        setOfflineReady(true)
      },
      immediate: true,
    })

    return () => {
      updateSW?.() // Clean up function
    }
  }, [])

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  const reloadApp = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
      setNeedRefresh(false)
      window.location.reload()
    }
  }

  return (
    <div className="PWABadge" role="alert">
      {(offlineReady || needRefresh) && (
        <div className="PWABadge-toast">
          <div className="PWABadge-message">
            {offlineReady ? (
              <span>App ready to work offline</span>
            ) : (
              <span>New content available. Click the reload button to update.</span>
            )}
          </div>
          <div className="PWABadge-buttons">
            {needRefresh && (
              <button className="PWABadge-toast-button" onClick={reloadApp}>
                Reload
              </button>
            )}
            <button className="PWABadge-toast-button" onClick={close}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PWABadge
