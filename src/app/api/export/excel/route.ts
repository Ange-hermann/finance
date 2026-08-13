import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactions, totals } = body;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Rapport Financier");

    sheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Montant (FCFA)", key: "montant", width: 18 },
      { header: "Categorie", key: "categorie", width: 18 },
      { header: "Mode", key: "mode", width: 12 },
      { header: "Agent", key: "agent", width: 20 },
      { header: "Contributeur", key: "contributeur", width: 20 },
      { header: "Reference", key: "reference", width: 25 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFC9A227" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0A0A0A" },
    };

    transactions.forEach((t: any) => {
      sheet.addRow({
        date: new Date(t.createdAt).toLocaleDateString("fr-FR"),
        montant: Number(t.montant),
        categorie: t.categorie,
        mode: t.mode,
        agent: t.agent?.nom || "—",
        contributeur: t.contributeur?.nom || "Anonyme",
        reference: t.referencePaiement || "—",
      });
    });

    sheet.addRow({});
    const totalRow = sheet.addRow({ date: "GRANDS TOTAUX" });
    totalRow.font = { bold: true, color: { argb: "FFC9A227" } };

    totals.forEach((t: { label: string; value: number }) => {
      const row = sheet.addRow({ date: t.label, montant: t.value });
      row.font = { bold: t.label === "Total general" };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rapport-finance.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erreur export Excel:", error);
    return NextResponse.json({ error: "Erreur génération Excel" }, { status: 500 });
  }
}
