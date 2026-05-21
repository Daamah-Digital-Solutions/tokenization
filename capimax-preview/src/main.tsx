import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './i18n/config' // Initialize i18n
import App from './App.tsx'

// Detect PWA standalone launch and tag the <html> with `.pwa-standalone`.
// Components/CSS can then opt into native-app-only treatments — e.g. the
// status-bar safe-area padding, or hiding the "install" banner.
const markStandalone = () => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // iOS-only legacy flag
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  document.documentElement.classList.toggle('pwa-standalone', isStandalone);
};
markStandalone();
// In case the OS switches display modes (rare, but desktop PWAs can be popped
// in/out of WCO mode), re-evaluate when the media query changes.
window.matchMedia('(display-mode: standalone)').addEventListener?.('change', markStandalone);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
