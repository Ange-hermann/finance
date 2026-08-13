import { PaymentProvider, PaymentSession, PaymentVerification } from "./provider";

export class MockPaymentProvider implements PaymentProvider {
  async createPaymentSession(
    montant: number,
    categorie: string,
    metadata: Record<string, unknown>
  ): Promise<PaymentSession> {
    const sessionId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const url = `/pay/mock-checkout?session=${sessionId}&montant=${montant}&categorie=${categorie}`;

    return { url, sessionId };
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    return {
      statut: "PAYE",
      reference: `REF_${sessionId}`,
    };
  }

  async handleWebhook(payload: unknown, signature?: string): Promise<PaymentVerification> {
    const data = payload as { sessionId?: string; statut?: string };
    return {
      statut: (data.statut as "PAYE" | "ECHEC" | "EN_ATTENTE") || "PAYE",
      reference: `REF_${data.sessionId || "mock"}`,
    };
  }
}
