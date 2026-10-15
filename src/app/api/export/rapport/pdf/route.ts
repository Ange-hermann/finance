import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";

function sanitize(text: string): string {
  return (text || "").replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u").replace(/ç/g, "c")
    .replace(/[   ]/g, " ").replace(/[^\x20-\x7E]/g, "");
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n).replace(/[  ]/g, " ");
}

function formatDateFr(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const SOURCE_LABELS: Record<string, string> = {
  CAISSE: "Caisse", ECONOMIE: "Economie", EPARGNE: "Epargne",
  CONSTRUCTION: "Construction", ACTION_SOCIALE: "Action sociale", PASTEUR: "Pasteur",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { periode, transactions, depenses, resume } = body;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const or = rgb(0.79, 0.64, 0.15);
    const noir = rgb(0.04, 0.04, 0.04);
    const gris = rgb(0.5, 0.5, 0.5);
    const rouge = rgb(0.7, 0.1, 0.1);
    const vert = rgb(0.1, 0.5, 0.2);

    let page = pdfDoc.addPage([595.28, 841.89]);
    let y = 792;

    const ensureSpace = (needed: number) => {
      if (y - needed < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 792;
      }
    };

    const titre = (text: string) => {
      ensureSpace(30);
      page.drawText(text, { x: 50, y, size: 13, font: fontBold, color: noir });
      y -= 20;
    };

    // ─── En-tête ───
    page.drawText("Rapport Detaille - CTF Finance", {
      x: 50, y, size: 18, font: fontBold, color: or,
    });
    y -= 20;
    page.drawText(`Periode : ${sanitize(periode?.label || "")}`, { x: 50, y, size: 10, font, color: gris });
    y -= 14;
    page.drawText(`Genere le : ${new Date().toLocaleDateString("fr-FR")}`, { x: 50, y, size: 9, font, color: gris });
    y -= 30;

    // ─── Résumé ───
    titre("Resume de la periode");
    const lignesResume = [
      [`Recettes (${transactions.length} transactions)`, resume?.recettes ?? 0],
      [`Depenses (${depenses.length} operations)`, resume?.depenses ?? 0],
      ["Net", resume?.net ?? 0],
    ];
    for (const [label, val] of lignesResume) {
      ensureSpace(16);
      page.drawText(sanitize(String(label)), { x: 60, y, size: 10, font, color: noir });
      page.drawText(formatNum(Number(val)) + " FCFA", { x: 350, y, size: 10, font: fontBold, color: or });
      y -= 16;
    }
    y -= 6;

    if (resume?.parCategorie?.length) {
      titre("Recettes par categorie");
      for (const [cat, montant] of resume.parCategorie) {
        ensureSpace(15);
        page.drawText(sanitize(cat), { x: 60, y, size: 9, font, color: noir });
        page.drawText(formatNum(Number(montant)) + " FCFA", { x: 350, y, size: 9, font: fontBold, color: noir });
        y -= 14;
      }
      y -= 10;
    }

    // ─── Transactions reçues ───
    y -= 6;
    titre(`Transactions recues (${transactions.length})`);
    const colsTx = [
      { label: "Date", x: 50 }, { label: "Montant", x: 110 }, { label: "Categorie", x: 185 },
      { label: "Fidele", x: 265 }, { label: "Mode", x: 370 }, { label: "Repartition", x: 435 },
    ];
    const headerTx = () => {
      ensureSpace(28);
      colsTx.forEach((c) => page.drawText(c.label, { x: c.x, y, size: 8, font: fontBold, color: gris }));
      y -= 13;
    };
    headerTx();

    for (const t of transactions) {
      ensureSpace(26);
      if (y === 792) headerTx();
      page.drawText(formatDateFr(t.createdAt), { x: 50, y, size: 7.5, font, color: noir });
      page.drawText(formatNum(t.montant) + " F", { x: 110, y, size: 7.5, font, color: noir });
      page.drawText(sanitize(t.categorie).slice(0, 14), { x: 185, y, size: 7.5, font, color: noir });
      page.drawText(sanitize(t.contributeur?.nom || "Anonyme").slice(0, 18), { x: 265, y, size: 7.5, font, color: noir });
      page.drawText(sanitize(t.mode).slice(0, 10), { x: 370, y, size: 7.5, font, color: noir });
      const r = t.repartition;
      const rep = r
        ? [
            r.montantCaisse > 0 ? `Caisse ${formatNum(r.montantCaisse)}` : "",
            r.montantEconomie > 0 ? `Eco ${formatNum(r.montantEconomie)}` : "",
            r.montantEpargne > 0 ? `Epar ${formatNum(r.montantEpargne)}` : "",
            r.montantActionSociale > 0 ? `Soc ${formatNum(r.montantActionSociale)}` : "",
            r.montantDimeDeLaDime ? `Dime ${formatNum(r.montantDimeDeLaDime)}` : "",
            r.montantFondsDedie > 0 ? `Const ${formatNum(r.montantFondsDedie)}` : "",
          ].filter(Boolean).join(" / ")
        : "-";
      page.drawText(sanitize(rep).slice(0, 28), { x: 435, y, size: 7, font, color: gris });
      y -= 13;
    }

    // ─── Dépenses ───
    y -= 16;
    titre(`Depenses (${depenses.length})`);
    const colsDep = [
      { label: "Date", x: 50 }, { label: "Montant", x: 110 }, { label: "Categorie", x: 185 },
      { label: "Fonds", x: 265 }, { label: "Beneficiaire", x: 370 }, { label: "Paiement", x: 480 },
    ];
    const headerDep = () => {
      ensureSpace(28);
      colsDep.forEach((c) => page.drawText(c.label, { x: c.x, y, size: 8, font: fontBold, color: gris }));
      y -= 13;
    };
    headerDep();

    for (const d of depenses) {
      ensureSpace(26);
      if (y === 792) headerDep();
      page.drawText(formatDateFr(d.dateDepense), { x: 50, y, size: 7.5, font, color: noir });
      page.drawText("-" + formatNum(d.montant) + " F", { x: 110, y, size: 7.5, font, color: rouge });
      page.drawText(sanitize(d.categorie).slice(0, 14), { x: 185, y, size: 7.5, font, color: noir });
      page.drawText(sanitize(SOURCE_LABELS[d.sourceFonds] || d.sourceFonds).slice(0, 16), { x: 265, y, size: 7.5, font, color: noir });
      page.drawText(sanitize(d.beneficiaire?.nom || "-").slice(0, 18), { x: 370, y, size: 7.5, font, color: noir });
      page.drawText(sanitize(d.statutPaiement || "MANUEL"), { x: 480, y, size: 7.5, font, color: d.statutPaiement === "PAYE" ? vert : gris });
      y -= 13;
    }

    // Description ligne pour les dépenses ayant un texte long
    const depAvecDesc = depenses.filter((d: any) => d.description);
    if (depAvecDesc.length) {
      y -= 16;
      titre("Details des depenses");
      for (const d of depAvecDesc) {
        ensureSpace(15);
        page.drawText(
          sanitize(`${formatDateFr(d.dateDepense)} - ${d.description}`).slice(0, 95),
          { x: 60, y, size: 8, font, color: noir }
        );
        y -= 13;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapport-detaille.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur export rapport PDF:", error);
    return NextResponse.json({ error: "Erreur génération PDF" }, { status: 500 });
  }
}
