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
      if (!proofText.trim()) throw new Error("Describe how you completed this challenge.");
      await onSubmit(proofText.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit.");
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
            Your proof is pending admin validation.
          </p>
        )}

        {cell.status === "validated" && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Challenge validated!
          </p>
        )}

        {(cell.status === "open" || cell.status === "rejected") && (
          <form className="mt-5 grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
            {cell.status === "rejected" && cell.rejectionNote && (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                Previous proof rejected: {cell.rejectionNote}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              No photos or videos on the site — describe your proof in text.
            </p>
            <textarea
              className={`${inputClass} min-h-32`}
              value={proofText}
              onChange={(event) => setProofText(event.target.value)}
              placeholder="E.g. We made the server laugh at the restaurant near Galata..."
              required
            />
            {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Submitting..." : "Submit"}</Button>
            </div>
          </form>
        )}

        {(cell.status === "pending" || cell.status === "validated") && (
          <Button className="mt-4" variant="secondary" onClick={onClose}>Close</Button>
        )}
      </Card>
    </div>
  );
}
