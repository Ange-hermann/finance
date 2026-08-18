import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { depenses, totals } = body;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Dépenses");

    sheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Type", key: "type", width: 18 },
      { header: "Catégorie", key: "categorie", width: 18 },
      { header: "Source", key: "source", width: 18 },
      { header: "Description", key: "description", width: 35 },
      { header: "Montant (FCFA)", key: "montant", width: 18 },
      { header: "Agent", key: "agent", width: 20 },
      { header: "Statut", key: "statut", width: 12 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFC9A227" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0A0A0A" },
    };

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

    depenses.forEach((d: any) => {
      sheet.addRow({
        date: new Date(d.dateDepense).toLocaleDateString("fr-FR"),
        type: TYPE_LABELS[d.type] || d.type,
        categorie: d.categorie,
        source: d.sourceFonds ? (SOURCE_LABELS[d.sourceFonds] || d.sourceFonds) : "—",
        description: d.description,
        montant: Number(d.montant),
        agent: d.agent?.nom || "—",
        statut: d.statut,
      });
    });

    sheet.addRow({});
    const totalRow = sheet.addRow({ date: "TOTAUX" });
    totalRow.font = { bold: true, color: { argb: "FFC9A227" } };

    totals.forEach((t: { label: string; value: number }) => {
      const row = sheet.addRow({ date: t.label, montant: t.value });
      row.font = { bold: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="depenses-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erreur export dépenses Excel:", error);
    return NextResponse.json({ error: "Erreur génération Excel" }, { status: 500 });
  }
}
