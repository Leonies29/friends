"use client";

import { FormEvent, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { BINGO_CATEGORY_META, BINGO_DIFFICULTY_META } from "@/lib/bingo-constants";
import type { BingoCell } from "@/types/bingo";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function BingoCellModal({
  cell,
  onClose,
  onSubmit
}: {
  cell: BingoCell;
  onClose: () => void;
  onSubmit: (proofText: string) => Promise<void>;
}) {
  const [proofText, setProofText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const difficulty = BINGO_DIFFICULTY_META[cell.difficulty];
  const category = BINGO_CATEGORY_META[cell.category];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!proofText.trim()) throw new Error("Décris comment tu as réalisé ce défi.");
      await onSubmit(proofText.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/50 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={difficulty.color}>{difficulty.emoji} {difficulty.label}</Badge>
          <Badge>{category.emoji} {category.label}</Badge>
          <Badge>{cell.points} pts</Badge>
        </div>
        <h2 className="mt-4 text-2xl font-black">{cell.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{cell.description}</p>

        {cell.status === "pending" && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Ta preuve est en attente de validation par un admin.
          </p>
        )}

        {cell.status === "validated" && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Défi validé !
          </p>
        )}

        {(cell.status === "open" || cell.status === "rejected") && (
          <form className="mt-5 grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
            <p className="text-sm text-muted-foreground">
              Aucune photo ni vidéo sur le site — décris ta preuve en texte.
            </p>
            <textarea
              className={`${inputClass} min-h-32`}
              value={proofText}
              onChange={(event) => setProofText(event.target.value)}
              placeholder="Ex : On a fait rire le serveur du resto près de Galata..."
              required
            />
            {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving ? "Envoi..." : "Soumettre"}</Button>
            </div>
          </form>
        )}

        {(cell.status === "pending" || cell.status === "validated") && (
          <Button className="mt-4" variant="secondary" onClick={onClose}>Fermer</Button>
        )}
      </Card>
    </div>
  );
}
