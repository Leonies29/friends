"use client";

import { Card } from "@/components/ui";
import type { BingoCard } from "@/types/bingo";

export function BingoStatsBar({ card }: { card: BingoCard }) {
  const progress = Math.round((card.validatedCount / 25) * 100);

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Card className="bg-emerald-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Points</p>
        <p className="mt-1 text-3xl font-black text-emerald-900">{card.totalPoints}</p>
      </Card>
      <Card className="bg-amber-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-amber-700">Bingos</p>
        <p className="mt-1 text-3xl font-black text-amber-900">{card.bingoCount}</p>
      </Card>
      <Card className="bg-sky-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Validés</p>
        <p className="mt-1 text-3xl font-black text-sky-900">{card.validatedCount}/25</p>
      </Card>
      <Card className="bg-violet-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-violet-700">Lignes</p>
        <p className="mt-1 text-3xl font-black text-violet-900">{card.completedLines.length}</p>
      </Card>
      <Card className="sm:col-span-4">
        <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
          <span>Progression</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </Card>
    </div>
  );
}
