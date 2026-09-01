import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
    <App />
  </StrictMode>,
)
