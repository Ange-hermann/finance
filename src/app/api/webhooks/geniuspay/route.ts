import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotificationToRole } from "@/lib/notifications";
import { depenseImputableAuSolde, marquerDepensePayee } from "@/lib/depenses";
import { finaliserPaiementEnLigne, devinerCategorieDepuisDescription } from "@/lib/paiements";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const { event, data } = body;

    // Vérification de la signature Genius Pay :
    // X-Webhook-Signature = HMAC-SHA256(timestamp + "." + payload, whsec)
    const webhookSecret = process.env.GENIUSPAY_WEBHOOK_SECRET || "";
    const signature =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-geniuspay-signature");
    const timestamp = request.headers.get("x-webhook-timestamp") || "";

    if (signature && webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSignature);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
      }

      // Protection anti-rejeu (fenêtre de 5 minutes)
      const ts = parseInt(timestamp, 10);
      if (!isNaN(ts) && Math.abs(Date.now() / 1000 - ts) > 300) {
        return NextResponse.json({ error: "Timestamp trop ancien" }, { status: 400 });
      }
    } else {
      console.warn("Webhook Genius Pay sans signature — traitement non vérifié");
    }

    console.log("Webhook Genius Pay reçu:", event, JSON.stringify(data).slice(0, 500));

    // ─── Événements de paiement sortant (payout/cashout vers bénéficiaire) ───
    if (
      event === "payout.completed" || event === "payout.failed" ||
      event === "cashout.completed" || event === "cashout.failed"
    ) {
      const payout = data?.payout || data;
      const reference = payout?.reference;
      const depenseId = payout?.metadata?.depenseId;
      const succeeded = event === "payout.completed" || event === "cashout.completed";

      const depense = depenseId
        ? await prisma.depense.findUnique({ where: { id: depenseId } })
        : await prisma.depense.findFirst({ where: { referencePaiement: reference } });

      if (depense) {
        if (succeeded) {
          await marquerDepensePayee(depense);
        } else {
          await prisma.depense.update({
            where: { id: depense.id },
            data: { statutPaiement: "ECHOUE" },
          });
        }

        await prisma.logAudit.create({
          data: {
            action: succeeded ? "PAIEMENT_DEPENSE_SORTANT" : "PAIEMENT_DEPENSE_ECHOUE",
            cible: `Dépense ${depense.id}`,
            details: `Payout ${reference} - ${depense.montant} FCFA - ${depense.sourceFonds}`,
          },
        });

        try {
          await sendPushNotificationToRole(
            "TREASURER",
            {
              title: succeeded ? "Dépense payée" : "Paiement échoué",
              body: `${depense.montant} FCFA - ${depense.description}`,
              data: { depenseId: depense.id },
            },
            prisma
          );
        } catch (error) {
          console.error("Erreur envoi notification:", error);
        }
      }

      return NextResponse.json({ success: true });
    }

    // ─── Paiement entrant réussi ───
    if (event === "payment.success" || event === "payment.completed") {
      const { reference, amount, customer, description } = data;

      // Ancien flux : référence EXP- = dépense (checkout legacy)
      if (reference?.startsWith("EXP-")) {
        const depense = await prisma.depense.findFirst({
          where: { referencePaiement: reference },
        });

        if (depense && depense.statutPaiement !== "PAYE") {
          await prisma.depense.update({
            where: { id: depense.id },
            data: { statutPaiement: "PAYE", datePaiement: new Date() },
          });

          const caisse = await prisma.caisse.findFirst();
          if (caisse && depense.sourceFonds === "CAISSE" && depenseImputableAuSolde(depense)) {
            await prisma.caisse.update({
              where: { id: caisse.id },
              data: { soldeActuel: { decrement: Number(amount) } },
            });
          }

          await prisma.logAudit.create({
            data: {
              action: "PAIEMENT_DEPENSE_SORTANT",
              cible: `Dépense ${depense.id}`,
              details: `Paiement Genius Pay de ${amount} FCFA - ${depense.sourceFonds}`,
            },
          });
        }

        return NextResponse.json({ success: true });
      }

      // Paiement entrant : retrouver la transaction par sa référence
      let transaction = await prisma.transaction.findFirst({
        where: { referencePaiement: reference },
        include: { contributeur: true },
      });

      if (!transaction) {
        // Fallback : la transaction n'a pas été retrouvée — on la crée
        const categorie = devinerCategorieDepuisDescription(description);
        transaction = await prisma.transaction.create({
          data: {
            montant: Number(amount),
            categorie: categorie as any,
            mode: "EN_LIGNE",
            statut: "EN_ATTENTE",
            referencePaiement: reference,
            agentId: null,
            contributeurId: null,
          },
          include: { contributeur: true },
        });
      }

      await finaliserPaiementEnLigne(
        { ...transaction, montant: Number(transaction.montant) },
        Number(amount)
      );
    }

    // ─── Paiement entrant échoué/annulé/expiré ───
    if (
      event === "payment.failed" ||
      event === "payment.cancelled" ||
      event === "payment.expired"
    ) {
      const { reference } = data;
      const transaction = await prisma.transaction.findFirst({
        where: { referencePaiement: reference },
      });
      if (transaction && transaction.statut === "EN_ATTENTE") {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { statut: "ANNULE" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur webhook Genius Pay:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
