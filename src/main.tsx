import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// Registro de Service Worker para PWA (forçando atualização sem cache para substituir SW antigo)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch(err => {
        console.log('Service Worker registration failed: ', err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);