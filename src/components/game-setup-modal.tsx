"use client";

import { X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { isGameInMenu } from "@/lib/game-navigation";
import { AssassinSetupPanel } from "@/components/game-setup/assassin-setup-panel";
import { ChallengeSetupPanel } from "@/components/game-setup/challenge-setup-panel";
import { BingoSetupPanel } from "@/components/game-setup/bingo-setup-panel";
import { ChecklistSetupPanel } from "@/components/game-setup/checklist-setup-panel";
import { QuizSetupPanel } from "@/components/game-setup/quiz-setup-panel";
import { PhotoSetupPanel } from "@/components/game-setup/photo-setup-panel";
import { QuestSetupPanel } from "@/components/game-setup/quest-setup-panel";
import type { Game } from "@/types";

const SETUP_LABELS: Record<Game["category"], string> = {
  treasure: "Configure quests before players start",
  assassin: "Configure targets and missions before starting",
  challenge: "Configure secret challenges",
  photo: "Configure travel album link",
  quiz: "Manage Istanbul & Turkey history questions",
  bingo: "Configure le pool de défis et lance la partie",
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
          {game.category === "treasure" && <QuestSetupPanel groupId={groupId} />}
          {game.category === "assassin" && <AssassinSetupPanel groupId={groupId} />}
          {game.category === "challenge" && <ChallengeSetupPanel groupId={groupId} />}
          {game.category === "photo" && <PhotoSetupPanel game={game} onSaved={onSaved} />}
          {game.category === "bingo" && <BingoSetupPanel game={game} groupId={groupId} />}
          {game.category === "quiz" && <QuizSetupPanel game={game} groupId={groupId} />}
          {game.category === "custom" && (
            <ChecklistSetupPanel game={game} onSaved={onSaved} />
          )}
        </div>
      </Card>
    </div>
  );
}
