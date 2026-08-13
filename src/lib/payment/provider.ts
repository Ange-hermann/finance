export interface PaymentSession {
  url: string;
  sessionId: string;
}

export interface PaymentVerification {
  statut: "PAYE" | "ECHEC" | "EN_ATTENTE";
  reference?: string;
}

export interface PaymentProvider {
  createPaymentSession(
    montant: number,
    categorie: string,
    metadata: Record<string, unknown>
  ): Promise<PaymentSession>;
  verifyPayment(sessionId: string): Promise<PaymentVerification>;
  handleWebhook(payload: unknown, signature?: string): Promise<PaymentVerification>;
}
