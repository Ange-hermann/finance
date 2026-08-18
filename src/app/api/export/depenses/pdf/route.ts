import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function sanitize(text: string): string {
  return text.replace(/[\u202F\u00A0\u2009]/g, " ");
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n).replace(/[\u202F\u00A0]/g, " ");
}

const TYPE_LABELS: Record<string, string> = {
  DEPENSE_CULTE: "Après culte",
  DEPENSE_NORMALE: "Normale",
};
const SOURCE_LABELS: Record<string, string> = {
  CAISSE: "Caisse",
  ECONOMIE: "Économie",
  EPARGNE: "Épargne",
  CONSTRUCTION: "Construction",
  ACTION_SOCIALE: "Action sociale",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { depenses, totals } = body;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([595.28, 841.89]);
    const { height } = page.getSize();

    const or = rgb(0.79, 0.64, 0.15);
    const noir = rgb(0.04, 0.04, 0.04);
    const gris = rgb(0.5, 0.5, 0.5);

    page.drawText("Rapport Dépenses - CTF Finance", {
      x: 50, y: height - 50, size: 20, font: fontBold, color: or,
    });
    page.drawText(`Date: ${new Date().toLocaleDateString("fr-FR")}`, {
      x: 50, y: height - 75, size: 10, font, color: gris,
    });

    let y = height - 110;
    page.drawText("Totaux", { x: 50, y, size: 14, font: fontBold, color: noir });
    y -= 25;

    totals.forEach((t: { label: string; value: number }) => {
      page.drawText(sanitize(t.label), { x: 50, y, size: 10, font, color: noir });
      page.drawText(formatNum(t.value) + " FCFA", { x: 350, y, size: 10, font: fontBold, color: or });
      y -= 18;
    });

    y -= 20;
    page.drawText("Dépenses", { x: 50, y, size: 14, font: fontBold, color: noir });
    y -= 25;

    page.drawText("Date", { x: 50, y, size: 9, font: fontBold, color: gris });
    page.drawText("Type", { x: 130, y, size: 9, font: fontBold, color: gris });
    page.drawText("Catégorie", { x: 210, y, size: 9, font: fontBold, color: gris });
    page.drawText("Description", { x: 300, y, size: 9, font: fontBold, color: gris });
    page.drawText("Montant", { x: 480, y, size: 9, font: fontBold, color: gris });
    y -= 15;

    depenses.forEach((d: any) => {
      if (y < 50) {
        pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }
      const date = sanitize(new Date(d.dateDepense).toLocaleDateString("fr-FR"));
      page.drawText(date, { x: 50, y, size: 8, font, color: noir });
      page.drawText(sanitize(TYPE_LABELS[d.type] || d.type), { x: 130, y, size: 8, font, color: noir });
      page.drawText(sanitize(d.categorie), { x: 210, y, size: 8, font, color: noir });
      const desc = sanitize(d.description).substring(0, 25);
      page.drawText(desc, { x: 300, y, size: 8, font, color: noir });
      page.drawText(formatNum(Number(d.montant)) + " FCFA", { x: 480, y, size: 8, font, color: noir });
      y -= 14;
    });

    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="depenses-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur export dépenses PDF:", error);
    return NextResponse.json({ error: "Erreur génération PDF" }, { status: 500 });
  }
}
