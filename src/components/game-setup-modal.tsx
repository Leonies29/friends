"use client";

import { X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { GameSetupContent } from "@/components/game-setup/game-setup-content";
import { isGameInMenu } from "@/lib/game-navigation";
import type { Game } from "@/types";

const SETUP_LABELS: Record<Game["category"], string> = {
  treasure: "Configure quests before players start",
  assassin: "Configure targets and missions before starting",
  challenge: "Configure secret challenges",
  photo: "Configure travel album link",
  quiz: "Manage Istanbul & Turkey history questions",
  bingo: "Configure the challenge pool and launch the game",
  custom: "Configure game content"
};

export function GameSetupModal({
  game,
  groupId,
  onClose,
  onSaved
}: {
  game: Game;
  groupId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const live = isGameInMenu(game);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-end bg-slate-950/40 sm:place-items-center sm:p-4" onClick={onClose}>
      <Card className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-b-none p-0 sm:rounded-[1.5rem]" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Badge>{live ? "Live game" : "Setup before start"}</Badge>
              <h2 className="mt-2 break-words text-2xl font-black sm:mt-3 sm:text-3xl">{game.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{SETUP_LABELS[game.category]}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <GameSetupContent game={game} groupId={groupId} onSaved={onSaved} />
        </div>
      </Card>
    </div>
  );
}
