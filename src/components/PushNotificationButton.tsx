"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

export default function PushNotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Vérifier la permission actuelle
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Votre navigateur ne supporte pas les notifications");
      return;
    }

    if (Notification.permission === "granted") {
      // Permission déjà accordée, enregistrer l'abonnement
      await subscribeToPush();
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      await subscribeToPush();
      toast.success("Notifications activées");
    } else {
      toast.error("Permission refusée");
    }
  };

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      // Envoyer l'abonnement au serveur
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      console.log("Abonnement push enregistré avec succès");
      toast.success("Abonnement aux notifications enregistré");
    } catch (error) {
      console.error("Erreur lors de l'abonnement push:", error);
      toast.error("Erreur lors de l'enregistrement des notifications");
    }
    setLoading(false);
  };

  if (!mounted || typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  return (
    <button
      onClick={requestPermission}
      disabled={loading || permission === "granted"}
      className="btn-outline-or text-xs px-3 py-1 flex items-center gap-2"
    >
      <Bell className="w-4 h-4" />
      {loading ? "Activation..." : permission === "granted" ? "Notifications activées" : "Activer les notifications"}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}