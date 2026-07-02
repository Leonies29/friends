"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { BingoCelebration } from "@/components/bingo/bingo-celebration";
import { BingoCellModal } from "@/components/bingo/bingo-cell-modal";
import { BingoGrid } from "@/components/bingo/bingo-grid";
import { BingoLeaderboardPanel } from "@/components/bingo/bingo-leaderboard-panel";
import { BingoStatsBar } from "@/components/bingo/bingo-stats-bar";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";
import { useActiveGroup } from "@/hooks/use-active-group";
import { bingoBonusPoints } from "@/lib/bingo-logic";
import { listGames } from "@/services/game-service";
import {
  getBingoCard,
  getBingoSession,
  listBingoLeaderboard,
  submitBingoProof
} from "@/services/bingo-service";
import type { Game } from "@/types";
import type { BingoCard, BingoCell } from "@/types/bingo";

export function BingoPage() {
  const state = useActiveGroup();
  const [bingoGame, setBingoGame] = useState<Game | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [leaderboard, setLeaderboard] = useState<Awaited<ReturnType<typeof listBingoLeaderboard>>>([]);
  const [sessionStatus, setSessionStatus] = useState<string>("setup");
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<BingoCell | null>(null);
  const [celebration, setCelebration] = useState<{ lines: string[]; points: number } | null>(null);
  const previousBingoCount = useRef(0);

  const displayName = useMemo(
    () => state.currentMember?.nickname || state.currentMember?.username || "Player",
    [state.currentMember]
  );

  const load = useCallback(async () => {
    if (!state.group?.id || !state.userId) return;
    setLoading(true);
    const games = await listGames(state.group.id);
    const activeBingo = games.find((game) => game.category === "bingo" && game.enabled && game.visible && !game.archived) ?? null;
    setBingoGame(activeBingo);

    if (!activeBingo) {
      setCard(null);
      setLeaderboard([]);
      setSessionStatus("setup");
      setLoading(false);
      return;
    }

    const [session, playerCard, ranking] = await Promise.all([
      getBingoSession(state.group.id, activeBingo.id),
      getBingoCard(state.group.id, activeBingo.id, state.userId),
      listBingoLeaderboard(state.group.id, activeBingo.id)
    ]);

    setSessionStatus(session?.status ?? "setup");
    setLeaderboard(ranking);

    if (playerCard && playerCard.bingoCount > previousBingoCount.current) {
      const delta = playerCard.bingoCount - previousBingoCount.current;
      const lines = playerCard.completedLines.slice(-delta);
      setCelebration({ lines, points: bingoBonusPoints(lines) });
      window.setTimeout(() => setCelebration(null), 3500);
    }
    previousBingoCount.current = playerCard?.bingoCount ?? 0;
    setCard(playerCard);
    setLoading(false);
  }, [state.group?.id, state.userId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => { void load(); }, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function handleSubmitProof(proofText: string) {
    if (!state.group?.id || !state.userId || !bingoGame || !card || !selectedCell) return;
    await submitBingoProof({
      groupId: state.group.id,
      gameId: bingoGame.id,
      card,
      userId: state.userId,
      userName: displayName,
      cellIndex: selectedCell.index,
      proofText
    });
    await load();
  }

  if (state.loading || loading) return <LoadingCard label="Chargement du bingo..." />;
  if (!state.group) return <EmptyGroupCard />;

  if (!bingoGame) {
    return (
      <PageShell eyebrow="Bingo Voyage" title="Bingo Voyage" description="Le bingo n'est pas encore activé pour ce voyage." group={state.group}>
        <Card><p className="text-sm text-muted-foreground">Demande à un admin d'activer le jeu Bingo dans Admin → Games.</p></Card>
      </PageShell>
    );
  }

  if (sessionStatus !== "active" || !card) {
    return (
      <PageShell eyebrow="Bingo Voyage" title={bingoGame.title} description="Ta grille sera disponible dès que l'admin lancera la partie." group={state.group}>
        <Card>
          <Badge>En attente</Badge>
          <p className="mt-3 text-sm text-muted-foreground">L'admin doit configurer les défis puis appuyer sur « Générer les grilles ».</p>
        </Card>
        <BingoLeaderboardPanel entries={leaderboard} />
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Bingo Voyage" title={bingoGame.title} description="Complète ta grille, décris tes preuves en texte et vise le BINGO !" group={state.group}>
      <BingoCelebration visible={Boolean(celebration)} lines={celebration?.lines ?? []} points={celebration?.points ?? 0} />
      <BingoStatsBar card={card} />
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Badge>Ta grille 5×5</Badge>
          <Button size="sm" variant="secondary" onClick={() => void load()}>Actualiser</Button>
        </div>
        <BingoGrid cells={card.cells} onCellClick={setSelectedCell} />
        <p className="mt-4 text-center text-xs font-semibold text-muted-foreground">
          🟢 Commun 1pt · 🟠 Rare 3pt · 🔴 Légendaire 5pt · BINGO +10pt
        </p>
      </Card>
      <BingoLeaderboardPanel entries={leaderboard} />

      {selectedCell && (
        <BingoCellModal
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
          onSubmit={handleSubmitProof}
        />
      )}
    </PageShell>
  );
}
