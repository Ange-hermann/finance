"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="btn-outline-or text-sm whitespace-nowrap flex items-center gap-1.5"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Copié
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copier
        </>
      )}
    </button>
  );
}
