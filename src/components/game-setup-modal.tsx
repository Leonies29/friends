"use client";

import { X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { isGameInMenu } from "@/lib/game-navigation";
import { AssassinSetupPanel } from "@/components/game-setup/assassin-setup-panel";
import { ChallengeSetupPanel } from "@/components/game-setup/challenge-setup-panel";
import { ChecklistSetupPanel } from "@/components/game-setup/checklist-setup-panel";
import { PhotoSetupPanel } from "@/components/game-setup/photo-setup-panel";
import { QuestSetupPanel } from "@/components/game-setup/quest-setup-panel";
import type { Game } from "@/types";

const SETUP_LABELS: Record<Game["category"], string> = {
  treasure: "Configure quests before players start",
  assassin: "Configure targets and missions before starting",
  challenge: "Configure secret challenges",
  photo: "Configure travel album link",
  quiz: "Configure quiz items",
  bingo: "Configure bingo items",
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
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" onClick={onClose}>
      <Card className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge>{live ? "Live game" : "Setup before start"}</Badge>
              <h2 className="mt-3 text-3xl font-black">{game.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{SETUP_LABELS[game.category]}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {game.category === "treasure" && <QuestSetupPanel groupId={groupId} />}
          {game.category === "assassin" && <AssassinSetupPanel groupId={groupId} />}
          {game.category === "challenge" && <ChallengeSetupPanel groupId={groupId} />}
          {game.category === "photo" && <PhotoSetupPanel game={game} onSaved={onSaved} />}
          {(game.category === "quiz" || game.category === "bingo" || game.category === "custom") && (
            <ChecklistSetupPanel game={game} onSaved={onSaved} />
          )}
        </div>
      </Card>
    </div>
  );
}
