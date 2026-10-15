"use client";

import { useRef, useState } from "react";
import { Link as LinkIcon, Copy, Check, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export default function PaymentLinkPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const paymentLink = `${appUrl}/pay`;
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const copyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    toast.success("Lien copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Paiement CTF Finance",
          text: "Faites votre dîme, offrande ou don en ligne",
          url: paymentLink,
        });
      } catch (error) {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("QR code introuvable");
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth || 200;
      canvas.height = svg.clientHeight || 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        toast.error("Erreur lors de la génération de l'image");
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = `ctf-finance-payment-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Code QR téléchargé");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Erreur lors de la génération de l'image");
    };

    img.src = url;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-aeonik text-2xl sm:text-3xl font-bold text-blanc uppercase">
          Lien de paiement
        </h1>
        <p className="text-blanc/50 text-sm mt-1">
          Partagez ce lien et code QR pour recevoir des paiements en ligne
        </p>
      </div>

      <div className="card-noir space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-or/10">
          <Check className="w-8 h-8 text-green-400" />
          <div>
            <h3 className="font-aeonik text-xl text-blanc">Lien de paiement générique</h3>
            <p className="text-blanc/50 text-sm">Les fidèles choisiront le type de paiement sur la page</p>
          </div>
        </div>

        <div className="flex justify-center">
          <div ref={qrRef} className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={paymentLink} size={200} includeMargin />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-or/5">
            <LinkIcon className="w-5 h-5 text-or shrink-0" />
            <p className="text-blanc text-sm font-mono break-all">{paymentLink}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="btn-outline-or flex-1 flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copié" : "Copier"}
            </button>
            <button
              onClick={shareLink}
              className="btn-outline-or flex-1 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Partager
            </button>
            <button
              onClick={downloadQR}
              className="btn-outline-or flex-1 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger QR
            </button>
          </div>
        </div>

        <a
          href={paymentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-or w-full text-center block"
        >
          Tester le lien de paiement
        </a>

        <div className="text-blanc/40 text-xs space-y-1">
          <p>• Les fidèles peuvent choisir : Dîme, Offrande ou Dons</p>
          <p>• Ils entrent le montant et leurs informations</p>
          <p>• Paiement sécurisé via Genius Pay (Wave, Orange Money, MTN MoMo, carte)</p>
          <p>• La répartition se fait automatiquement après paiement</p>
        </div>
      </div>
    </div>
  );
}