import { PaymentProvider, PaymentSession, PaymentVerification } from "./provider";

export class MoneyFusionProvider implements PaymentProvider {
  private apiUrl: string;
  private appUrl: string;

  constructor() {
    this.apiUrl = process.env.MONEY_FUSION_API_URL || "";
    this.appUrl = process.env.APP_URL || "http://localhost:3000";

    if (!this.apiUrl) {
      throw new Error("MONEY_FUSION_API_URL non configuré dans .env");
    }
  }

  async createPaymentSession(
    montant: number,
    categorie: string,
    metadata: Record<string, unknown>
  ): Promise<PaymentSession> {
    const paymentData = {
      totalPrice: montant,
      article: [{ [categorie]: montant }],
      personal_Info: [
        {
          lienId: metadata.lienId || null,
          contributeurNom: metadata.contributeurNom || null,
          contributeurTelephone: metadata.contributeurTelephone || null,
          contributeurEmail: metadata.contributeurEmail || null,
          categorie,
          montant,
        },
      ],
      numeroSend: metadata.contributeurTelephone || "",
      nomclient: metadata.contributeurNom || "Fidèle",
      return_url: `${this.appUrl}/pay/callback`,
      webhook_url: `${this.appUrl}/api/webhooks/payment`,
    };

    const res = await fetch(this.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Money Fusion API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const token = data.tokenPay || data.token || data.sessionId;
    const url = data.url || data.payment_url || `https://www.pay.moneyfusion.net/paiement/${token}`;

    return { url, sessionId: token };
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    const res = await fetch(
      `https://www.pay.moneyfusion.net/paiementNotif/${sessionId}`
    );

    if (!res.ok) {
      return { statut: "EN_ATTENTE" };
    }

    const data = await res.json();
    const statut = (data.statut || data.status || "").toLowerCase();

    if (statut === "paid" || statut === "completed") {
      return {
        statut: "PAYE",
        reference: data.numeroTransaction || data.tokenPay || sessionId,
      };
    }
    if (statut === "pending") {
      return { statut: "EN_ATTENTE" };
    }
    return { statut: "ECHEC" };
  }

  async handleWebhook(payload: unknown, _signature?: string): Promise<PaymentVerification> {
    const data = payload as {
      event?: string;
      tokenPay?: string;
      numeroTransaction?: string;
      statut?: string;
      status?: string;
    };

    const event = (data.event || "").toLowerCase();
    const statut = (data.statut || data.status || "").toLowerCase();

    if (event === "payin.session.completed" || statut === "paid" || statut === "completed") {
      return {
        statut: "PAYE",
        reference: data.numeroTransaction || data.tokenPay || "",
      };
    }
    if (event === "payin.session.cancelled" || statut === "failure" || statut === "cancelled") {
      return { statut: "ECHEC" };
    }
    return { statut: "EN_ATTENTE" };
  }
}
