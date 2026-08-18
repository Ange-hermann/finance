"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const canShow = Date.now() - dismissedTime > oneDay;

    // Android/PC: beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (canShow) setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Show prompt after delay if not standalone and not dismissed
    // This works in dev mode where beforeinstallprompt may not fire
    if (!standalone && canShow) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-slide-up">
      <div className="card-noir border-or/40 shadow-gold">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blanc-pur flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/Logo.png" alt="CTF Finance" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-display text-sm text-blanc font-medium">Installer CTF Finance</p>
              <p className="text-blanc/40 text-xs">Accédez-y comme une app</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-blanc/40 hover:text-blanc shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-2">
            <p className="text-blanc/60 text-xs leading-relaxed">
              Pour installer sur iOS :
            </p>
            <div className="flex items-center gap-2 text-xs text-blanc/80 bg-noir-soft rounded-lg p-2">
              <span>1. Tapez sur</span>
              <Share className="w-4 h-4 text-or" />
              <span>(bouton Partager)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blanc/80 bg-noir-soft rounded-lg p-2">
              <span>2. Puis</span>
              <PlusSquare className="w-4 h-4 text-or" />
              <span>« Sur l'écran d'accueil »</span>
            </div>
            <button
              onClick={handleDismiss}
              className="btn-outline-or text-xs w-full mt-2"
            >
              J'ai compris
            </button>
          </div>
        ) : deferredPrompt ? (
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="btn-or text-sm flex-1 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="btn-outline-or text-sm"
            >
              Plus tard
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-blanc/60 text-xs leading-relaxed">
              Pour installer sur ordinateur :
            </p>
            <div className="flex items-center gap-2 text-xs text-blanc/80 bg-noir-soft rounded-lg p-2">
              <Download className="w-4 h-4 text-or" />
              <span>Cliquez sur l'icône « Installer » dans la barre d'adresse de Chrome/Edge</span>
            </div>
            <button
              onClick={handleDismiss}
              className="btn-outline-or text-xs w-full mt-2"
            >
              Plus tard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
