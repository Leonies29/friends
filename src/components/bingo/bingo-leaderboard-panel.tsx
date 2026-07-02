"use client";

import { Avatar, Badge, Card } from "@/components/ui";
import type { BingoLeaderboardEntry } from "@/types/bingo";

export function BingoLeaderboardPanel({ entries }: { entries: BingoLeaderboardEntry[] }) {
  if (!entries.length) {
    return <Card><p className="text-sm text-muted-foreground">Le classement apparaîtra quand la partie sera lancée.</p></Card>;
  }

  return (
    <Card>
      <Badge>Classement Bingo</Badge>
      <div className="mt-4 grid gap-2">
        {entries.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-sm font-black">
              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
            </span>
            <Avatar src="" alt={entry.displayName} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black">{entry.displayName}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {entry.validatedCount} défis · {entry.bingoCount} bingos
              </p>
            </div>
            <p className="text-xl font-black">{entry.totalPoints} pts</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
