import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { captureSharedLink } from './utils/shareTarget'
import { reloadForNewBuild } from './app/appUtils'

// A link shared into the installed app (Android share sheet) lands on /pocket?share_url=…
captureSharedLink()

// After a deploy, an open page may ask for chunks that no longer exist: reload into the new build
window.addEventListener('vite:preloadError', (e) => { if (reloadForNewBuild()) e.preventDefault(); })

// Global suppression for Pinterest extension on all images
if (typeof document !== 'undefined') {
  const disablePinterestOnImages = () => {
    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('data-pin-nopin')) {
        img.setAttribute('data-pin-nopin', 'true');
        img.setAttribute('data-pin-no-hover', 'true');
      }
    });
  };
  disablePinterestOnImages();
  const observer = new MutationObserver(disablePinterestOnImages);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
