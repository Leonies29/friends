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
import { formatFirestoreError } from "@/lib/firebase-errors";
import { listGames } from "@/services/game-service";
import {
  ensureBingoCardForPlayer,
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
  const [error, setError] = useState("");
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
    setError("");
    try {
      const games = await listGames(state.group.id);
      const activeBingo = games.find((game) => game.category === "bingo" && game.enabled && game.visible && !game.archived) ?? null;
      setBingoGame(activeBingo);

      if (!activeBingo) {
        setCard(null);
        setLeaderboard([]);
        setSessionStatus("setup");
        return;
      }

      const session = await getBingoSession(state.group.id, activeBingo.id);
      setSessionStatus(session?.status ?? "setup");

      let playerCard = await getBingoCard(state.group.id, activeBingo.id, state.userId);
      if (!playerCard && session?.status === "active") {
        playerCard = await ensureBingoCardForPlayer({
          groupId: state.group.id,
          gameId: activeBingo.id,
          userId: state.userId,
          displayName: displayName
        });
      }

      const ranking = await listBingoLeaderboard(state.group.id, activeBingo.id);
      setLeaderboard(ranking);

      if (playerCard && playerCard.bingoCount > previousBingoCount.current) {
        const delta = playerCard.bingoCount - previousBingoCount.current;
        const lines = playerCard.completedLines.slice(-delta);
        setCelebration({ lines, points: bingoBonusPoints(lines) });
        window.setTimeout(() => setCelebration(null), 3500);
      }
      previousBingoCount.current = playerCard?.bingoCount ?? 0;
      setCard(playerCard);
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to load bingo."));
    } finally {
      setLoading(false);
    }
  }, [state.group?.id, state.userId, displayName]);

  useEffect(() => { void load(); }, [load]);

  async function handleSubmitProof(proofText: string) {
    if (!state.group?.id || !state.userId || !bingoGame || !card || !selectedCell) return;
    try {
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
    } catch (err) {
      throw new Error(formatFirestoreError(err, "Unable to submit your proof."));
    }
  }

  if (state.loading || loading) return <LoadingCard label="Loading bingo..." />;
  if (!state.group) return <EmptyGroupCard />;

  if (!bingoGame) {
    return (
      <PageShell eyebrow="Travel Bingo" title="Travel Bingo" description="Bingo is not enabled for this trip yet." group={state.group}>
        <Card><p className="text-sm text-muted-foreground">Ask an admin to enable Bingo in Admin → Games.</p></Card>
      </PageShell>
    );
  }

  if (sessionStatus !== "active" || !card) {
    return (
      <PageShell eyebrow="Travel Bingo" title={bingoGame.title} description="Your grid will be available once the admin launches the game." group={state.group}>
        {error && <Card><p className="text-sm font-semibold text-rose-700">{error}</p></Card>}
        <Card>
          <Badge>{sessionStatus === "active" ? "Grid pending" : "Waiting"}</Badge>
          <p className="mt-3 text-sm text-muted-foreground">
            {sessionStatus === "active"
              ? "The game is live but your grid is not ready yet. Tap Refresh or ask an admin to relaunch grids."
              : "The admin must configure challenges then press Generate grids."}
          </p>
          <Button className="mt-4" size="sm" variant="secondary" onClick={() => void load()}>Refresh</Button>
        </Card>
        <BingoLeaderboardPanel entries={leaderboard} />
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Travel Bingo" title={bingoGame.title} description="Complete your grid, describe your proofs in text, and go for BINGO!" group={state.group}>
      {error && <Card><p className="text-sm font-semibold text-rose-700">{error}</p></Card>}
      <BingoCelebration visible={Boolean(celebration)} lines={celebration?.lines ?? []} points={celebration?.points ?? 0} />
      <BingoStatsBar card={card} />
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Badge>Your 5×5 grid</Badge>
          <Button size="sm" variant="secondary" onClick={() => void load()}>Refresh</Button>
        </div>
        <BingoGrid cells={card.cells} onCellClick={setSelectedCell} />
        <p className="mt-4 text-center text-xs font-semibold text-muted-foreground">
          🟢 Common 1pt · 🟠 Rare 3pt · 🔴 Legendary 5pt · BINGO +10pt
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
