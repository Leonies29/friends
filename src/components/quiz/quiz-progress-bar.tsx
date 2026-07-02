"use client";

import { Card } from "@/components/ui";

export function QuizProgressBar({ current, total }: { current: number; total: number }) {
  const percent = total ? Math.round((current / total) * 100) : 0;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
        <span>Progress</span>
        <span>{current}/{total} · {percent}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </Card>
  );
}
