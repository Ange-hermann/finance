"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";

interface DepenseData {
  id: string;
  type: string;
  categorie: string;
  sourceFonds: string;
  description: string;
  montant: number;
  dateDepense: string;
  statut: string;
  agent?: { nom: string } | null;
}

interface TotalItem {
  label: string;
  value: number;
}

export default function DepenseExportButtons({
  depenses,
  totals,
}: {
  depenses: DepenseData[];
  totals: TotalItem[];
}) {
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

  const exportPDF = async () => {
    setLoading("pdf");
    try {
      const res = await fetch("/api/export/depenses/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depenses, totals }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `depenses-${new Date().toISOString().split("T")[0]}.pdf`;
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
      const res = await fetch("/api/export/depenses/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depenses, totals }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `depenses-${new Date().toISOString().split("T")[0]}.xlsx`;
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
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <button
        onClick={exportPDF}
        disabled={loading !== null}
        className="btn-outline-or text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        {loading === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Export PDF
      </button>
      <button
        onClick={exportExcel}
        disabled={loading !== null}
        className="btn-outline-or text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        {loading === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
        Export Excel
      </button>
    </div>
  );
}
