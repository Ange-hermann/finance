import webpush from 'web-push';

// Clés VAPID pour les notifications push
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('Clés VAPID non configurées. Les notifications push ne fonctionneront pas.');
}

webpush.setVapidDetails(
  'mailto:ctf-finance@eglise.org',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: any;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
) {
  try {
    const pushPayload = JSON.stringify({
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/ctf.png',
        data: payload.data,
      },
    });

    await webpush.sendNotification(subscription, pushPayload);
    return { success: true };
  } catch (error) {
    console.error('Erreur envoi notification push:', error);
    return { success: false, error };
  }
}

export async function sendPushNotificationToRole(
  role: string,
  payload: NotificationPayload,
  prisma: any
) {
  try {
    // Récupérer tous les abonnements pour ce rôle
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { role },
    });

    const results = await Promise.all(
      subscriptions.map((sub: any) =>
        sendPushNotification(sub.subscription as PushSubscription, payload)
      )
    );

    return {
      success: true,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };
  } catch (error) {
    console.error('Erreur envoi notifications au rôle:', error);
    return { success: false, error };
  }
}

export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: NotificationPayload,
  prisma: any
) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    const results = await Promise.all(
      subscriptions.map((sub: any) =>
        sendPushNotification(sub.subscription as PushSubscription, payload)
      )
    );

    return {
      success: true,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };
  } catch (error) {
    console.error('Erreur envoi notifications aux utilisateurs:', error);
    return { success: false, error };
  }
}