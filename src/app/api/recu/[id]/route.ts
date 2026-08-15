import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

function sanitize(text: string): string {
  return text.replace(/[\u202F\u00A0\u2009]/g, " ");
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n).replace(/[\u202F\u00A0]/g, " ");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recu = await prisma.recu.findUnique({
      where: { id: params.id },
      include: {
        transaction: {
          include: { contributeur: true, repartition: true },
        },
      },
    });

    if (!recu) {
      return NextResponse.json({ error: "Reçu non trouvé" }, { status: 404 });
    }

    const t = recu.transaction;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const or = rgb(0.79, 0.64, 0.15);
    const noir = rgb(0.04, 0.04, 0.04);
    const gris = rgb(0.5, 0.5, 0.5);

    // Logo
    const logoPath = path.join(process.cwd(), "public", "Logo.png");
    let logoEmbed = null;
    try {
      const logoBytes = fs.readFileSync(logoPath);
      logoEmbed = await pdfDoc.embedPng(logoBytes);
    } catch {}

    const logoSize = 60;
    const logoX = 50;
    const logoY = height - 75;
    if (logoEmbed) {
      page.drawImage(logoEmbed, {
        x: logoX,
        y: logoY,
        width: logoSize,
        height: logoSize,
      });
    }

    // Header
    page.drawText("RECU DE PAIEMENT", {
      x: width / 2 - 100,
      y: height - 50,
      size: 22,
      font: fontBold,
      color: or,
    });

    page.drawText("Centre de Transformation des Familles", {
      x: width / 2 - 110,
      y: height - 75,
      size: 10,
      font,
      color: gris,
    });

    // Line separator
    page.drawLine({
      start: { x: 50, y: height - 95 },
      end: { x: width - 50, y: height - 95 },
      thickness: 1,
      color: or,
    });

    // Reçu info
    let y = height - 125;
    page.drawText(`Recu N°: ${recu.id}`, { x: 50, y, size: 11, font, color: noir });
    page.drawText(`Date: ${sanitize(new Date(recu.createdAt).toLocaleDateString("fr-FR"))}`, {
      x: width - 200, y, size: 11, font, color: noir,
    });
    y -= 30;

    page.drawText(`Transaction: ${t.id}`, { x: 50, y, size: 10, font, color: gris });
    y -= 25;

    // Contributeur
    page.drawText("Contributeur:", { x: 50, y, size: 11, font: fontBold, color: noir });
    y -= 18;
    page.drawText(sanitize(t.contributeur?.nom || "Anonyme"), { x: 50, y, size: 11, font, color: noir });
    if (t.contributeur?.telephone) {
      y -= 15;
      page.drawText(`Tel: ${sanitize(t.contributeur.telephone)}`, { x: 50, y, size: 10, font, color: gris });
    }
    y -= 30;

    // Montant
    page.drawText("Montant:", { x: 50, y, size: 11, font: fontBold, color: noir });
    page.drawText(
      formatNum(Number(t.montant)) + " FCFA",
      { x: 200, y, size: 14, font: fontBold, color: or }
    );
    y -= 25;

    page.drawText(`Categorie: ${sanitize(t.categorie)}`, { x: 50, y, size: 11, font, color: noir });
    y -= 20;
    page.drawText(`Mode: ${sanitize(t.mode)}`, { x: 50, y, size: 11, font, color: noir });
    if (t.referencePaiement) {
      y -= 20;
      page.drawText(`Reference: ${sanitize(t.referencePaiement)}`, { x: 50, y, size: 11, font, color: noir });
    }

    // Footer
    page.drawLine({
      start: { x: 50, y: 80 },
      end: { x: width - 50, y: 80 },
      thickness: 0.5,
      color: gris,
    });
    page.drawText("Ce recu a ete genere automatiquement par la plateforme Centre de Transformation des Familles.", {
      x: 50, y: 60, size: 8, font, color: gris,
    });

    const pdfBytes = await pdfDoc.save();
    const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    return new NextResponse(arrayBuffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="recu-${recu.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur génération reçu:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
