"use client";

import { Crown, Shield } from "lucide-react";
import { Badge, GameCard } from "@/components/ui";
import { cn } from "@/lib/utils";

export function AnimatedAchievementCard({ title, description, unlocked }: { title: string; description: string; unlocked: boolean }) {
  return (
    <GameCard className={cn("relative overflow-hidden hover:-translate-y-2", unlocked ? "border-accent/40" : "opacity-70 grayscale")}>
      {unlocked && <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-[var(--success)] shadow-[0_0_22px_rgba(66,231,165,0.8)]" />}
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
        {unlocked ? <Crown className="h-7 w-7" /> : <Shield className="h-7 w-7" />}
      </div>
      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Badge className="mt-5">{unlocked ? "Unlocked" : "Locked"}</Badge>
    </GameCard>
  );
}
