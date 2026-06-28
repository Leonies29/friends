"use client";

import { useState } from "react";
import { CheckCircle2, Gift, Sparkles } from "lucide-react";
import { Badge, Button, GameCard } from "@/components/ui";
import { cn } from "@/lib/utils";

export function DailyRewardCard() {
  const [claimed, setClaimed] = useState(false);

  return (
    <GameCard className="relative overflow-hidden">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />
      <div className="flex items-start justify-between gap-4">
        <div><Badge>Daily Login Reward</Badge><h3 className="mt-3 text-2xl font-black">Day 3 Streak Chest</h3><p className="mt-2 text-sm text-muted-foreground">Claim bonus XP for showing up before the group chat starts panicking.</p></div>
        <Gift className="h-10 w-10 text-accent" />
      </div>
      <div className="mt-5 grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, index) => <div key={index} className={cn("grid aspect-square place-items-center rounded-2xl text-xs font-black", index < 3 ? "bg-accent text-slate-950" : "bg-muted text-muted-foreground")}>{index + 1}</div>)}
      </div>
      <Button variant={claimed ? "secondary" : "gold"} className="mt-5 w-full" onClick={() => setClaimed(true)}>
        {claimed ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {claimed ? "Reward Claimed" : "Claim +120 XP"}
      </Button>
    </GameCard>
  );
}
