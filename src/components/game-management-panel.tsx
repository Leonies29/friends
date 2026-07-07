"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { GameCustomizeModal } from "@/components/game-customize-modal";
import { GameSetupModal } from "@/components/game-setup-modal";
import { notifyGamesUpdated } from "@/lib/game-events";
import { getGameNavTarget, isGameInMenu } from "@/lib/game-navigation";
import {
  archiveGame,
  duplicateGame,
  toggleGameActive
} from "@/services/game-service";
import type { Game } from "@/types";

function EmojiControl({
  emoji,
  label,
  onClick,
  disabled,
  active
}: {
  emoji: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-lg transition disabled:opacity-40 ${
        active ? "border-primary bg-primary/15" : "border-border bg-card hover:bg-muted"
      }`}
    >
      {emoji}
    </button>
  );
}

function gameStatusEmoji(game: Game) {
  if (game.archived) return "📦";
  if (isGameInMenu(game)) return "🟢";
  return "⚪";
}

export function GameManagementPanel({
  groupId,
  games,
  onReload,
  embedded = false
}: {
  groupId: string;
  games: Game[];
  onReload: () => Promise<void>;
  embedded?: boolean;
}) {
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [setupGame, setSetupGame] = useState<Game | null>(null);

  const activeGames = useMemo(
    () => games.filter((game) => !game.archived).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [games]
  );
  const archivedGames = useMemo(() => games.filter((game) => game.archived), [games]);

  async function refresh() {
    await onReload();
    notifyGamesUpdated();
  }

  async function handleToggle(game: Game) {
    await toggleGameActive(game);
    await refresh();
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        {!embedded && (
          <div className="min-w-0">
            <Badge>Games</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              ⚙️ configure content · ▶️ show in menu · ✏️ edit title and XP
            </p>
          </div>
        )}
        <Button
          asChild
          variant="secondary"
          size="sm"
          className={`h-9 w-9 shrink-0 rounded-2xl px-0 ${embedded ? "ml-auto" : ""}`}
          title="Create game"
          aria-label="Create game"
        >
          <Link href="/admin/games/new">➕</Link>
        </Button>
      </div>

      <div className={`grid gap-2 ${embedded ? "mt-3" : "mt-5"}`}>
        {activeGames.map((game) => {
          const nav = getGameNavTarget(game.category);
          const inMenu = isGameInMenu(game);
          return (
            <div key={game.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background px-3 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="shrink-0 text-xl" title={inMenu ? "In menu" : "Hidden"}>{gameStatusEmoji(game)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-black">{game.title}</p>
                    <span className="text-xs font-semibold text-muted-foreground">{nav.emoji} {nav.label}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{game.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                <EmojiControl emoji="⚙️" label="Configure game content" onClick={() => setSetupGame(game)} />
                <EmojiControl emoji="✏️" label="Edit title and XP rules" onClick={() => setEditingGame(game)} />
                <EmojiControl
                  emoji={inMenu ? "⏸️" : "▶️"}
                  label={inMenu ? "Hide from menu" : "Show in menu"}
                  active={inMenu}
                  onClick={() => void handleToggle(game)}
                />
                <EmojiControl emoji="📋" label="Duplicate" onClick={() => void duplicateGame(game).then(refresh)} />
                <EmojiControl emoji="🗑️" label="Archive" onClick={() => void archiveGame(game.id).then(refresh)} />
              </div>
            </div>
          );
        })}
      </div>

      {archivedGames.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-3">
          <p className="text-sm font-black">📦 Archived ({archivedGames.length})</p>
          <div className="mt-2 grid gap-2">
            {archivedGames.map((game) => (
              <p key={game.id} className="text-sm text-muted-foreground">{game.title}</p>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {editingGame && (
        <GameCustomizeModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSaved={() => void refresh()}
        />
      )}

      {setupGame && (
        <GameSetupModal
          game={setupGame}
          groupId={groupId}
          onClose={() => setSetupGame(null)}
          onSaved={() => void refresh()}
        />
      )}

      {embedded ? body : <Card>{body}</Card>}
    </>
  );
}
