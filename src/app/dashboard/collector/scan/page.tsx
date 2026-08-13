"use client";

import { useState, useRef } from "react";
import { ScanLine, Camera, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ScanPage() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    import("@zxing/browser").then(({ BrowserQRCodeReader }) => {
      const reader = new BrowserQRCodeReader();
      const imgUrl = URL.createObjectURL(file);
      reader
        .decodeFromImageUrl(imgUrl)
        .then((res: { getText: () => string }) => {
          setResult(res.getText());
          toast.success("QR code lu avec succès");
        })
        .catch(() => {
          setError("Aucun QR code détecté dans l'image");
          toast.error("Aucun QR code détecté");
        });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-blanc">Scan QR Code</h1>
        <p className="text-blanc/50 text-sm mt-1">
          Scannez un QR code de paiement pour le rapprocher avec une transaction
        </p>
      </div>

      <div className="card-noir">
        <div className="text-center py-8">
          <ScanLine className="w-16 h-16 text-or mx-auto mb-4" />
          <h3 className="font-display text-xl text-blanc mb-2">Scanner un QR code</h3>
          <p className="text-blanc/50 text-sm mb-6 max-w-md mx-auto">
            Uploadez une image contenant un QR code de paiement. Le système le décodera
            et affichera les informations de la transaction correspondante.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-or inline-flex items-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Choisir une image
          </button>
        </div>
      </div>

      {result && (
        <div className="card-noir animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <h3 className="font-display text-xl text-blanc">QR Code décodé</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between p-3 rounded-xl bg-or/5">
              <span className="text-blanc/50 text-sm">Contenu</span>
              <span className="text-blanc text-sm font-mono break-all">{result}</span>
            </div>
            <a href={result} target="_blank" rel="noopener noreferrer" className="btn-outline-or w-full text-center block mt-4">
              Ouvrir le lien
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="card-noir animate-fade-in">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <p className="text-blanc/60">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
