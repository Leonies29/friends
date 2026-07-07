"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GameSetupContent } from "@/components/game-setup/game-setup-content";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { isGameInMenu } from "@/lib/game-navigation";
import { notifyGamesUpdated } from "@/lib/game-events";
import { canManageGames, resolveEffectiveRole } from "@/services/permissions";
import { getGame } from "@/services/game-service";
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

export function GameSetupPage({ gameId: initialGameId }: { gameId: string }) {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId ?? initialGameId;
  const router = useRouter();
  const state = useActiveGroup();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = resolveEffectiveRole(state.currentMember, state.group, state.userId);
  const canAdmin = canManageGames(role);

  useEffect(() => {
    if (!gameId || state.loading) return;

    setLoading(true);
    setError("");
    void getGame(gameId)
      .then((loaded) => {
        if (!loaded) {
          setError("Game not found.");
          setGame(null);
          return;
        }
        if (loaded.groupId !== state.group?.id) {
          setError("This game belongs to another group.");
          setGame(null);
          return;
        }
        setGame(loaded);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load game.");
        setGame(null);
      })
      .finally(() => setLoading(false));
  }, [gameId, state.group?.id, state.loading]);

  function handleSaved() {
    notifyGamesUpdated();
    void getGame(gameId).then((loaded) => {
      if (loaded) setGame(loaded);
    });
  }

  if (state.loading || loading) {
    return (
      <Card className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="font-semibold text-muted-foreground">Loading game setup...</p>
      </Card>
    );
  }

  if (!state.group || !canAdmin) {
    return (
      <Card>
        <Badge>Admin</Badge>
        <h1 className="mt-3 text-2xl font-black">Access denied</h1>
        <Button asChild className="mt-4" variant="secondary">
          <Link href="/admin">Back to admin</Link>
        </Button>
      </Card>
    );
  }

  if (error || !game) {
    return (
      <Card>
        <Badge>Setup</Badge>
        <p className="mt-3 text-sm font-semibold text-rose-600">{error || "Game not found."}</p>
        <Button asChild className="mt-4" variant="secondary">
          <Link href="/admin">Back to admin</Link>
        </Button>
      </Card>
    );
  }

  const live = isGameInMenu(game);

  return (
    <div className="grid gap-4 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => router.push("/admin")}>
          Done
        </Button>
      </div>

      <Card>
        <Badge>{live ? "Live game" : "Setup before start"}</Badge>
        <h1 className="mt-3 break-words font-display text-2xl font-black sm:text-3xl">{game.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{SETUP_LABELS[game.category]}</p>
      </Card>

      <Card>
        <GameSetupContent game={game} groupId={state.group.id} onSaved={handleSaved} />
      </Card>
    </div>
  );
}
