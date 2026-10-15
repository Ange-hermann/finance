declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function generateVAPIDKeys(): VapidKeys;

  export function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer,
    options?: {
      contentEncoding?: 'aes128gcm' | 'aesgcm';
      proxy?: string;
      timeout?: number;
      headers?: Record<string, string>;
    }
  ): Promise<void>;

  export function encrypt(
    userDetails: PushSubscription,
    payload: string | Buffer,
    options?: {
      contentEncoding?: 'aes128gcm' | 'aesgcm';
    }
  ): Promise<{
    ciphertext: Buffer;
    salt: Buffer;
    serverPublicKey: Buffer;
  }>;

  export const SupportedContentEncodings: ('aes128gcm' | 'aesgcm')[];
}
