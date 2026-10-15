import { PaymentProvider, PaymentSession, PaymentVerification, PayoutResult, PayoutRecipient } from "./provider";

const PAYOUT_BASE_URL = "https://pay.genius.ci/api/v1/merchant";

// Correspondance entre le mode de paiement du bénéficiaire et le provider
// mobile money attendu par l'API Payout Genius Pay
export const PAYOUT_PROVIDER_PAR_MODE: Record<string, string> = {
  WAVE: "wave",
  ORANGE_MOMO: "orange_money",
  MTN_MOMO: "mtn_momo",
};

export class GeniusPayProvider implements PaymentProvider {
  async createPaymentSession(amount: number, description: string, metadata?: Record<string, any>): Promise<PaymentSession> {
    const response = await fetch("https://geniuspay.ci/api/v1/merchant/payments", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.GENIUSPAY_API_KEY || "",
        "X-API-Secret": process.env.GENIUSPAY_API_SECRET || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "XOF",
        description,
        customer: {
          name: metadata?.customerName || "Utilisateur",
          email: metadata?.customerEmail || "",
          phone: metadata?.customerPhone || "",
          country: "CI",
        },
        success_url: `${process.env.APP_URL}/payment/success`,
        error_url: `${process.env.APP_URL}/payment/error`,
        metadata,
      }),
    });

    const data = await response.json();

    console.log("Réponse Genius Pay:", data);

    if (!response.ok) {
      throw new Error(data.message || "Erreur lors de la création du paiement Genius Pay");
    }

    // Genius Pay retourne { success: true, data: { ... } }
    const paymentData = data.data || data;

    return {
      id: paymentData.reference,
      sessionId: paymentData.reference,
      amount,
      currency: "XOF",
      paymentUrl: paymentData.payment_url || paymentData.checkout_url || paymentData.url,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    // Pour Genius Pay, la vérification se fait via webhook
    // On retourne le statut basé sur une vérification API
    const response = await fetch(`https://geniuspay.ci/api/v1/merchant/payments/${sessionId}`, {
      method: "GET",
      headers: {
        "X-API-Key": process.env.GENIUSPAY_API_KEY || "",
        "X-API-Secret": process.env.GENIUSPAY_API_SECRET || "",
      },
    });

    const data = await response.json();

    return {
      statut: data.status === "completed" ? "PAYE" : "ECHEC",
      reference: data.reference,
      transactionId: data.reference,
    };
  }

  private async getPayoutWalletId(): Promise<string> {
    if (process.env.GENIUSPAY_WALLET_ID) {
      return process.env.GENIUSPAY_WALLET_ID;
    }

    const response = await fetch(`${PAYOUT_BASE_URL}/wallets`, {
      headers: {
        Authorization: `Bearer ${process.env.GENIUSPAY_API_KEY || ""}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Impossible de récupérer les wallets Genius Pay");
    }

    const wallets = data.data?.wallets || data.wallets || [];
    const wallet =
      wallets.find((w: any) => w.type === "payout" && w.status === "active") ||
      wallets[0];

    if (!wallet?.id) {
      throw new Error("Aucun wallet payout Genius Pay disponible — configurez GENIUSPAY_WALLET_ID");
    }

    return wallet.id;
  }

  async createPayout(
    amount: number,
    description: string,
    recipient: PayoutRecipient,
    metadata?: Record<string, any>
  ): Promise<PayoutResult> {
    const walletId = await this.getPayoutWalletId();

    const response = await fetch(`${PAYOUT_BASE_URL}/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GENIUSPAY_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wallet_id: walletId,
        recipient: {
          name: recipient.nom,
          phone: recipient.telephone,
          email: recipient.email || undefined,
        },
        destination: {
          type: "mobile_money",
          provider: recipient.provider,
          account: recipient.telephone,
        },
        amount,
        currency: "XOF",
        description,
        metadata,
        idempotency_key: metadata?.reference || metadata?.depenseId,
      }),
    });

    const data = await response.json();
    console.log("Réponse Genius Pay payout:", data);

    if (!response.ok || data.success === false) {
      throw new Error(
        data.error?.message || data.message || "Erreur lors de l'initiation du payout Genius Pay"
      );
    }

    const payout = data.data?.payout || data.payout || data;

    return {
      reference: payout.reference,
      status: payout.status === "completed" ? "completed" : payout.status === "failed" ? "failed" : "pending",
      fees: payout.fees !== undefined ? Number(payout.fees) : undefined,
    };
  }

  async cancelPayout(reference: string, reason?: string): Promise<boolean> {
    const response = await fetch(`${PAYOUT_BASE_URL}/payouts/${reference}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GENIUSPAY_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: reason || "Dépense annulée" }),
    });

    return response.ok;
  }

  async handleWebhook(payload: unknown, signature?: string): Promise<PaymentVerification> {
    const data = payload as any;
    const statut = (data.status || "").toLowerCase();

    if (statut === "completed" || statut === "success") {
      return {
        statut: "PAYE",
        reference: data.reference,
        transactionId: data.reference,
      };
    }
    if (statut === "failed" || statut === "cancelled") {
      return {
        statut: "ECHEC",
        reference: data.reference,
      };
    }
    return {
      statut: "EN_ATTENTE",
      reference: data.reference,
    };
  }
}