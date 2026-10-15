"use client";

import { useEffect, useState } from "react";

export default function PushNotificationProvider() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Vérifier la permission actuelle
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Votre navigateur ne supporte pas les notifications");
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
    }
  };

  const subscribeToPush = async () => {
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
    } catch (error) {
      console.error("Erreur lors de l'abonnement push:", error);
    }
  };

  // Ne rien afficher pour l'instant, l'utilisateur demandera les notifications via un bouton
  return null;
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