"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { GameCustomizeModal } from "@/components/game-customize-modal";
import { notifyGamesUpdated } from "@/lib/game-events";
import { getGameNavTarget, isGameInMenu } from "@/lib/game-navigation";
import {
  archiveGame,
  createGame,
  duplicateGame,
  toggleGameActive
} from "@/services/game-service";
import type { Game, GameCategory } from "@/types";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

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
  onReload
}: {
  groupId: string;
  games: Game[];
  onReload: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const activeGames = useMemo(
    () => games.filter((game) => !game.archived).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [games]
  );
  const archivedGames = useMemo(() => games.filter((game) => game.archived), [games]);

  async function refresh() {
    await onReload();
    notifyGamesUpdated();
  }

  async function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    await createGame(groupId, {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      icon: String(form.get("icon") ?? "Gamepad2"),
      category: String(form.get("category") ?? "custom") as GameCategory
    });
    event.currentTarget.reset();
    await refresh();
    setSaving(false);
  }

  async function handleToggle(game: Game) {
    await toggleGameActive(game);
    await refresh();
  }

  return (
    <>
      {editingGame && (
        <GameCustomizeModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSaved={() => void refresh()}
        />
      )}

      <Card>
        <Badge>Games management</Badge>
        <p className="mt-2 text-sm text-muted-foreground">
          🟢 = visible in menu · ⚪ = hidden · One toggle controls menu + activation together.
        </p>

        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => void handleCreateGame(event)}>
          <input name="title" required placeholder="Game title" className={inputClass} />
          <select name="category" className={inputClass} defaultValue="custom">
            <option value="custom">Custom</option>
            <option value="challenge">Challenge</option>
            <option value="photo">Photo</option>
            <option value="treasure">Treasure Hunt</option>
            <option value="quiz">Quiz</option>
            <option value="bingo">Bingo</option>
            <option value="assassin">Assassin</option>
          </select>
          <Button type="submit" disabled={saving} className="h-11 w-11 shrink-0 rounded-2xl px-0" title="Create game" aria-label="Create game">
            ➕
          </Button>
          <input name="description" placeholder="Short description" className={`${inputClass} md:col-span-3`} />
        </form>

        <div className="mt-5 grid gap-2">
          {activeGames.map((game) => {
            const nav = getGameNavTarget(game.category);
            const inMenu = isGameInMenu(game);
            return (
              <div key={game.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3">
                <span className="text-xl" title={inMenu ? "In menu" : "Hidden"}>{gameStatusEmoji(game)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{game.title}</p>
                    <span className="text-xs font-semibold text-muted-foreground">{nav.emoji} {nav.label}</span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{game.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <EmojiControl emoji="✏️" label="Customize" onClick={() => setEditingGame(game)} />
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
      </Card>
    </>
  );
}
