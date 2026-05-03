/**
 * useLeaflet — shared Leaflet.js loader composable
 * Injects Leaflet CSS + JS from CDN once, caches on window.L
 * No SRI integrity hashes (they vary by CDN edge and cause silent blocks)
 */

const LEAFLET_VERSION = '1.9.4'
const CDN_BASE        = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist`

let _promise = null   // singleton — only one load attempt ever

export function useLeaflet() {
  /**
   * Returns a Promise that resolves to window.L when Leaflet is ready,
   * or null if it fails to load within 8 seconds.
   */
  function loadLeaflet() {
    // Already loaded
    if (window.L) return Promise.resolve(window.L)

    // Already loading — return same promise
    if (_promise) return _promise

    _promise = new Promise(resolve => {
      // 1. Inject CSS (idempotent)
      if (!document.getElementById('leaflet-css')) {
        const link  = document.createElement('link')
        link.id     = 'leaflet-css'
        link.rel    = 'stylesheet'
        link.href   = `${CDN_BASE}/leaflet.css`
        document.head.appendChild(link)
      }

      // 2. Inject JS (idempotent)
      if (!document.getElementById('leaflet-js')) {
        const script   = document.createElement('script')
        script.id      = 'leaflet-js'
        script.src     = `${CDN_BASE}/leaflet.js`
        // No integrity / crossOrigin — avoids SRI hash mismatch blocking the script
        script.onload  = () => resolve(window.L)
        script.onerror = () => {
          console.error('[Leaflet] Failed to load from CDN:', script.src)
          _promise = null   // allow retry
          resolve(null)
        }
        document.head.appendChild(script)
      } else {
        // Script tag already in DOM but window.L may not be ready yet — poll
        const interval = setInterval(() => {
          if (window.L) { clearInterval(interval); clearTimeout(timeout); resolve(window.L) }
        }, 80)
        const timeout = setTimeout(() => {
          clearInterval(interval)
          console.error('[Leaflet] Timed out waiting for window.L')
          resolve(null)
        }, 8000)
      }
    })

    return _promise
  }

  return { loadLeaflet }
}