"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Enregistre le service worker (requis pour les notifications push)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Erreur enregistrement service worker:", err);
      });
    }
  }, []);

  return null;
}
