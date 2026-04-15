import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

// Reload once when Vite chunk loading fails after a new deploy (stale cache)
const CHUNK_RELOAD_KEY = 'wohl_chunk_error_reload';
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason ?? '');
  if (message.includes('Failed to fetch dynamically imported module')) {
    if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')!).render(<App />);
