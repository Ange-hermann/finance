import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotificationToRole } from "@/lib/notifications";
import { depenseImputableAuSolde, marquerDepensePayee } from "@/lib/depenses";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    // Vérifier le webhook secret
    const signature = request.headers.get("x-geniuspay-signature");
    const webhookSecret = process.env.GENIUSPAY_WEBHOOK_SECRET || "";

    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(body))
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
      }
    }

    console.log("Webhook Genius Pay reçu:", event, data);

    // Événements de paiement sortant (payout vers un bénéficiaire)
    if (event === "payout.completed" || event === "payout.failed") {
      const payout = data?.payout || data;
      const reference = payout?.reference;
      const depenseId = payout?.metadata?.depenseId;

      const depense = depenseId
        ? await prisma.depense.findUnique({ where: { id: depenseId } })
        : await prisma.depense.findFirst({ where: { referencePaiement: reference } });

      if (depense) {
        if (event === "payout.completed") {
          await marquerDepensePayee(depense);
        } else {
          await prisma.depense.update({
            where: { id: depense.id },
            data: { statutPaiement: "ECHOUE" },
          });
        }

        await prisma.logAudit.create({
          data: {
            action: event === "payout.completed" ? "PAIEMENT_DEPENSE_SORTANT" : "PAIEMENT_DEPENSE_ECHOUE",
            cible: `Dépense ${depense.id}`,
            details: `Payout ${reference} - ${depense.montant} FCFA - ${depense.sourceFonds}`,
          },
        });

        try {
          await sendPushNotificationToRole(
            "TREASURER",
            {
              title: event === "payout.completed" ? "Dépense payée" : "Paiement échoué",
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

    // Traiter les événements de paiement
    if (event === "payment.completed" || event === "payment.success") {
      const { reference, amount, currency, customer, description } = data;

      // Vérifier si c'est un paiement de dépense sortant (référence EXP-)
      if (reference?.startsWith("EXP-")) {
        const depense = await prisma.depense.findFirst({
          where: { referencePaiement: reference },
        });

        if (depense && depense.statutPaiement !== "PAYE") {
          await prisma.depense.update({
            where: { id: depense.id },
            data: { statutPaiement: "PAYE", datePaiement: new Date() },
          });

          // Déduire de la caisse physique (fonds CAISSE uniquement — les
          // autres fonds sont des fonds par répartition, pas de l'argent
          // physique, et les dépenses culte liées passent par le recalcul
          // de la répartition)
          const caisse = await prisma.caisse.findFirst();
          if (caisse && depense.sourceFonds === "CAISSE" && depenseImputableAuSolde(depense)) {
            await prisma.caisse.update({
              where: { id: caisse.id },
              data: { soldeActuel: { decrement: Number(amount) } },
            });
          }

          // Log d'audit
          await prisma.logAudit.create({
            data: {
              action: "PAIEMENT_DEPENSE_SORTANT",
              cible: `Dépense ${depense.id}`,
              details: `Paiement Genius Pay de ${amount} FCFA - ${depense.sourceFonds}`,
            },
          });

          // Notification au pasteur et trésorière
          try {
            await sendPushNotificationToRole(
              "PASTOR",
              {
                title: "Dépense payée",
                body: `${amount} FCFA payés - ${depense.description}`,
                data: { depenseId: depense.id },
              },
              prisma
            );
          } catch (error) {
            console.error("Erreur envoi notification:", error);
          }

          try {
            await sendPushNotificationToRole(
              "TREASURER",
              {
                title: "Dépense payée",
                body: `${amount} FCFA payés - ${depense.description}`,
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

      // Chercher la transaction existante par référence (paiement entrant)
      const existingTransaction = await prisma.transaction.findFirst({
        where: { referencePaiement: reference },
        include: { contributeur: true },
      });

      if (existingTransaction && existingTransaction.statut === "EN_ATTENTE") {
        // Valider la transaction existante
        await prisma.transaction.update({
          where: { id: existingTransaction.id },
          data: { statut: "VALIDE" },
        });

        const categorie = existingTransaction.categorie;

        // Répartition automatique SEULEMENT pour les offrandes et dons
        // Les dîmes sont gérées par le pasteur (pas de répartition automatique)
        if (categorie !== "DIME") {
          const { calculerRepartition } = await import("@/lib/finance");
          const repartition = calculerRepartition(
            Number(amount),
            categorie as any
          );

          await prisma.repartition.create({
            data: {
              transactionId: existingTransaction.id,
              montantCaisse: repartition.montantCaisse,
              montantEconomie: repartition.montantEconomie,
              montantEpargne: repartition.montantEpargne,
              montantActionSociale: repartition.montantActionSociale,
              montantDimeDeLaDime: repartition.montantDimeDeLaDime,
              montantFondsDedie: repartition.montantFondsDedie,
            },
          });

          // Ajuster la caisse
          const caisse = await prisma.caisse.findFirst();
          if (caisse) {
            await prisma.caisse.update({
              where: { id: caisse.id },
              data: { soldeActuel: { increment: repartition.montantCaisse } },
            });
          }
        }

        // Créer un reçu
        await prisma.recu.create({
          data: { transactionId: existingTransaction.id },
        });

        // Log d'audit
        await prisma.logAudit.create({
          data: {
            action: "PAIEMENT_EN_LIGNE",
            cible: `Transaction ${existingTransaction.id}`,
            details: `Paiement en ligne de ${amount} FCFA pour ${categorie}`,
          },
        });

        // Envoyer notification push au pasteur pour toutes les transactions
        try {
          await sendPushNotificationToRole(
            "PASTOR",
            {
              title: `Nouveau paiement: ${categorie}`,
              body: `${amount} FCFA - ${existingTransaction.contributeur?.nom || "Anonyme"}`,
              data: { transactionId: existingTransaction.id },
            },
            prisma
          );
        } catch (error) {
          console.error("Erreur envoi notification:", error);
        }
      } else if (!existingTransaction) {
        // Fallback si la transaction n'existe pas (ancien workflow)
        const categorie = description?.toLowerCase().includes("dîme") || description?.toLowerCase().includes("dime")
          ? "DIME"
          : description?.toLowerCase().includes("construction")
          ? "CONSTRUCTION"
          : description?.toLowerCase().includes("don")
          ? "DON_SPECIAL"
          : description?.toLowerCase().includes("projet")
          ? "PROJET"
          : description?.toLowerCase().includes("autre")
          ? "AUTRE"
          : "OFFRANDE";

        const transaction = await prisma.transaction.create({
          data: {
            montant: Number(amount),
            categorie: categorie as any,
            mode: "EN_LIGNE",
            statut: "VALIDE",
            referencePaiement: reference,
            agentId: null,
            contributeurId: null,
          },
        });

        if (categorie !== "DIME") {
          const { calculerRepartition } = await import("@/lib/finance");
          const repartition = calculerRepartition(
            Number(amount),
            categorie as any
          );

          await prisma.repartition.create({
            data: {
              transactionId: transaction.id,
              montantCaisse: repartition.montantCaisse,
              montantEconomie: repartition.montantEconomie,
              montantEpargne: repartition.montantEpargne,
              montantActionSociale: repartition.montantActionSociale,
              montantDimeDeLaDime: repartition.montantDimeDeLaDime,
              montantFondsDedie: repartition.montantFondsDedie,
            },
          });

          const caisse = await prisma.caisse.findFirst();
          if (caisse) {
            await prisma.caisse.update({
              where: { id: caisse.id },
              data: { soldeActuel: { increment: repartition.montantCaisse } },
            });
          }
        }

        await prisma.recu.create({
          data: { transactionId: transaction.id },
        });

        await prisma.logAudit.create({
          data: {
            action: "PAIEMENT_EN_LIGNE",
            cible: `Transaction ${transaction.id}`,
            details: `Paiement en ligne de ${amount} FCFA pour ${categorie}`,
          },
        });

        try {
          await sendPushNotificationToRole(
            "PASTOR",
            {
              title: `Nouveau paiement: ${categorie}`,
              body: `${amount} FCFA - ${customer?.name || "Anonyme"}`,
              data: { transactionId: transaction.id },
            },
            prisma
          );
        } catch (error) {
          console.error("Erreur envoi notification:", error);
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur webhook Genius Pay:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}