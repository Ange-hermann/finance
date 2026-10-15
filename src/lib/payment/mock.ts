import { PaymentProvider, PaymentSession, PaymentVerification, PayoutResult, PayoutRecipient } from "./provider";

export class MockPaymentProvider implements PaymentProvider {
  async createPaymentSession(
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<PaymentSession> {
    const sessionId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const url = `/pay/mock-checkout?session=${sessionId}&amount=${amount}&description=${encodeURIComponent(description)}`;

    return { url, paymentUrl: url, sessionId, amount, currency: "XOF" };
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    return {
      statut: "PAYE",
      reference: `REF_${sessionId}`,
    };
  }

  async createPayout(
    amount: number,
    description: string,
    recipient: PayoutRecipient,
    metadata?: Record<string, any>
  ): Promise<PayoutResult> {
    return {
      reference: `PYT-MOCK-${Date.now()}`,
      status: "completed",
      fees: 0,
    };
  }

  async cancelPayout(): Promise<boolean> {
    return true;
  }

  async handleWebhook(payload: unknown, signature?: string): Promise<PaymentVerification> {
    const data = payload as { sessionId?: string; statut?: string };
    return {
      statut: (data.statut as "PAYE" | "ECHEC" | "EN_ATTENTE") || "PAYE",
      reference: `REF_${data.sessionId || "mock"}`,
    };
  }
}
