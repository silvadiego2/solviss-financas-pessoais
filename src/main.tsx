import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('✅ PWA Service Worker registrado:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Falha ao registrar Service Worker:', error);
      });
  });
}
