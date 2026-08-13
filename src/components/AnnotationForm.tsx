"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Loader2 } from "lucide-react";

export default function AnnotationForm({ transactionId }: { transactionId: string }) {
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentaire.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, commentaire }),
      });

      if (res.ok) {
        toast.success("Annotation ajoutée");
        setCommentaire("");
        setShow(false);
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="text-or/70 hover:text-or text-xs flex items-center gap-1 mt-3 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        Ajouter une annotation
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        placeholder="Votre annotation d'audit..."
        rows={2}
        className="input-noir w-full text-sm resize-none"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-or text-sm px-4 py-2 flex items-center gap-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter"}
        </button>
        <button type="button" onClick={() => setShow(false)} className="btn-outline-or text-sm px-4 py-2">
          Annuler
        </button>
      </div>
    </form>
  );
}
