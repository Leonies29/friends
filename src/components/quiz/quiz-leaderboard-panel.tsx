"use client";

import { Badge, Card } from "@/components/ui";
import type { QuizLeaderboardEntry } from "@/types/quiz";

export function QuizLeaderboardPanel({ entries }: { entries: QuizLeaderboardEntry[] }) {
  if (!entries.length) {
    return <Card><p className="text-sm text-muted-foreground">No one has played the quiz yet.</p></Card>;
  }

  return (
    <Card>
      <Badge>Quiz leaderboard</Badge>
      <div className="mt-4 grid gap-2">
        {entries.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-sm font-black">
              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black">{entry.displayName}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {entry.correctCount}/{entry.totalAnswered} correct · {entry.successRate}% success
              </p>
            </div>
            <p className="text-xl font-black">{entry.score} pts</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
