"use client";

import { Card } from "@/components/ui";
import type { BingoCard } from "@/types/bingo";

export function BingoStatsBar({ card }: { card: BingoCard }) {
  const progress = Math.round((card.validatedCount / 25) * 100);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className="bg-emerald-50 p-3 sm:p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 sm:text-xs">Points</p>
        <p className="mt-1 text-2xl font-black text-emerald-900 sm:text-3xl">{card.totalPoints}</p>
      </Card>
      <Card className="bg-amber-50 p-3 sm:p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 sm:text-xs">Bingos</p>
        <p className="mt-1 text-2xl font-black text-amber-900 sm:text-3xl">{card.bingoCount}</p>
      </Card>
      <Card className="bg-sky-50 p-3 sm:p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-sky-700 sm:text-xs">Validated</p>
        <p className="mt-1 text-2xl font-black text-sky-900 sm:text-3xl">{card.validatedCount}/25</p>
      </Card>
      <Card className="bg-violet-50 p-3 sm:p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-violet-700 sm:text-xs">Lines</p>
        <p className="mt-1 text-2xl font-black text-violet-900 sm:text-3xl">{card.completedLines.length}</p>
      </Card>
      <Card className="col-span-2 lg:col-span-4">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground sm:text-sm">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </Card>
    </div>
  );
}
