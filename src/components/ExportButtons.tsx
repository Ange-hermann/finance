"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";

interface TransactionData {
  id: string;
  montant: number | { toNumber: () => number };
  categorie: string;
  mode: string;
  referencePaiement: string | null;
  createdAt: Date;
  contributeur: { nom: string | null } | null;
  agent: { nom: string } | null;
  repartition: {
    montantEconomie: number | { toNumber: () => number };
    montantEpargne: number | { toNumber: () => number };
    montantActionSociale: number | { toNumber: () => number };
    montantDimeDeLaDime: number | { toNumber: () => number } | null;
    montantCaisse: number | { toNumber: () => number };
    montantFondsDedie: number | { toNumber: () => number };
  } | null;
}

interface TotalItem {
  label: string;
  value: number;
}

export default function ExportButtons({
  transactions,
  totals,
}: {
  transactions: TransactionData[];
  totals: TotalItem[];
}) {
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

  const exportPDF = async () => {
    setLoading("pdf");
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions, totals }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapport-finance-${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF généré");
      } else {
        toast.error("Erreur génération PDF");
      }
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(null);
    }
  };

  const exportExcel = async () => {
    setLoading("excel");
    try {
      const res = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions, totals }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapport-finance-${new Date().toISOString().split("T")[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Excel généré");
      } else {
        toast.error("Erreur génération Excel");
      }
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={exportPDF}
        disabled={loading !== null}
        className="btn-outline-or text-sm flex items-center gap-2"
      >
        {loading === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Export PDF
      </button>
      <button
        onClick={exportExcel}
        disabled={loading !== null}
        className="btn-outline-or text-sm flex items-center gap-2"
      >
        {loading === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
        Export Excel
      </button>
    </div>
  );
}
