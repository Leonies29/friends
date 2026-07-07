"use client";

import { AssassinSetupPanel } from "@/components/game-setup/assassin-setup-panel";
import { ChallengeSetupPanel } from "@/components/game-setup/challenge-setup-panel";
import { BingoSetupPanel } from "@/components/game-setup/bingo-setup-panel";
import { ChecklistSetupPanel } from "@/components/game-setup/checklist-setup-panel";
import { QuizSetupPanel } from "@/components/game-setup/quiz-setup-panel";
import { PhotoSetupPanel } from "@/components/game-setup/photo-setup-panel";
import { QuestSetupPanel } from "@/components/game-setup/quest-setup-panel";
import type { Game } from "@/types";

export function GameSetupContent({
  game,
  groupId,
  onSaved
}: {
  game: Game;
  groupId: string;
  onSaved?: () => void;
}) {
  return (
    <>
      {game.category === "treasure" && <QuestSetupPanel groupId={groupId} />}
      {game.category === "assassin" && <AssassinSetupPanel groupId={groupId} />}
      {game.category === "challenge" && <ChallengeSetupPanel groupId={groupId} />}
      {game.category === "photo" && <PhotoSetupPanel game={game} onSaved={onSaved ?? (() => undefined)} />}
      {game.category === "bingo" && <BingoSetupPanel game={game} groupId={groupId} />}
      {game.category === "quiz" && <QuizSetupPanel game={game} groupId={groupId} />}
      {game.category === "custom" && <ChecklistSetupPanel game={game} onSaved={onSaved ?? (() => undefined)} />}
    </>
  );
}
