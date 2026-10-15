export interface PaymentSession {
  id?: string;
  url?: string;
  paymentUrl?: string;
  checkoutUrl?: string;
  sessionId?: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
}

export interface PaymentVerification {
  statut: "PAYE" | "ECHEC" | "EN_ATTENTE";
  reference?: string;
  status?: string;
  transactionId?: string;
}

export interface PayoutResult {
  reference: string;
  status: "pending" | "completed" | "failed";
  fees?: number;
}

export interface PayoutRecipient {
  nom: string;
  telephone: string;
  email?: string;
  // wave | orange_money | mtn_momo (mobile money)
  provider: string;
}

export interface PaymentProvider {
  createPaymentSession(
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<PaymentSession>;
  verifyPayment(sessionId: string): Promise<PaymentVerification>;
  handleWebhook(payload: unknown, signature?: string): Promise<PaymentVerification>;
  // Paiement sortant (versement à un bénéficiaire) — optionnel selon le provider
  createPayout?(
    amount: number,
    description: string,
    recipient: PayoutRecipient,
    metadata?: Record<string, any>
  ): Promise<PayoutResult>;
  cancelPayout?(reference: string, reason?: string): Promise<boolean>;
}
