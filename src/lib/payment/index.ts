import { PaymentProvider } from "./provider";
import { MockPaymentProvider } from "./mock";

export type { PaymentProvider, PaymentSession, PaymentVerification } from "./provider";
export { MockPaymentProvider } from "./mock";

let providerInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (providerInstance) return providerInstance;

  const providerName = process.env.PAYMENT_PROVIDER || "mock";

  switch (providerName) {
    case "stripe":
      throw new Error("Stripe provider non encore implémenté. Utilisez PAYMENT_PROVIDER=mock pour le développement.");
    case "cinetpay":
      throw new Error("CinetPay provider non encore implémenté. Utilisez PAYMENT_PROVIDER=mock pour le développement.");
    case "paydunya":
      throw new Error("PayDunya provider non encore implémenté. Utilisez PAYMENT_PROVIDER=mock pour le développement.");
    case "mock":
    default:
      providerInstance = new MockPaymentProvider();
      break;
  }

  return providerInstance;
}
