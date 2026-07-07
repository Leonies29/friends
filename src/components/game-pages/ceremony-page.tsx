"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Avatar, Badge, Button, Card, Progress } from "@/components/ui";
import { filterActiveGameMembers } from "@/lib/game-members";
import { useActiveGroup } from "@/hooks/use-active-group";
import { getAwardResults, getVoteParticipationStats, listAwardCategories } from "@/services/award-service";
import { loadAssassinState } from "@/services/assassin-service";
import { listGroupQuests } from "@/services/quest-service";
import { listXpTransactions } from "@/services/xp-service";
import { calculateLevel } from "@/lib/utils";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

export function CeremonyPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [xpWinner, setXpWinner] = useState<{ name: string; avatarUrl: string; xp: number } | null>(null);
  const [assassinWinner, setAssassinWinner] = useState<{ name: string; avatarUrl: string } | null>(null);
  const [secretCount, setSecretCount] = useState(0);
  const [participation, setParticipation] = useState<Awaited<ReturnType<typeof getVoteParticipationStats>> | null>(null);
  const [awardWinners, setAwardWinners] = useState<Array<{ id: string; emoji: string; title: string; winnerName: string }>>([]);

  const load = useCallback(async (silent = false) => {
    if (!state.group?.id) return;
    if (silent) setRefreshing(true);
    else setLoading(true);

    const groupId = state.group.id;
    const activeMemberIds = filterActiveGameMembers(state.members).map((member) => member.userId || member.id);
    const [transactions, assassin, quests, awardResults, voteStats, categories] = await Promise.all([
      listXpTransactions(groupId),
      loadAssassinState(groupId),
      listGroupQuests(groupId),
      getAwardResults(groupId),
      getVoteParticipationStats(groupId, activeMemberIds),
      listAwardCategories(groupId)
    ]);

    const xpRows = filterActiveGameMembers(state.members).map((member) => {
      const id = member.userId || member.id;
      return {
        id,
        name: memberName(member),
        avatarUrl: member.avatarUrl ?? "",
        xp: transactions.filter((item) => item.userId === id).reduce((sum, item) => sum + item.amount, 0)
      };
    }).sort((a, b) => b.xp - a.xp);

    const winnerPlayer = assassin.game?.winnerId
      ? assassin.players.find((player) => player.uid === assassin.game?.winnerId)
      : [...assassin.players].filter((player) => player.isAlive)[0]
        ?? [...assassin.players].sort((a, b) => b.eliminationCount - a.eliminationCount)[0];

    const visibleCategories = categories.filter((category) => category.visible !== false);
    const winners = visibleCategories.map((category) => {
      const ranked = awardResults.get(category.id) ?? [];
      const top = ranked[0];
      const winnerMember = top
        ? state.members.find((member) => (member.userId || member.id) === top.userId)
        : null;
      return {
        id: category.id,
        emoji: category.emoji,
        title: category.title,
        winnerName: winnerMember ? memberName(winnerMember) : "—"
      };
    });

    setXpWinner(xpRows[0] ?? null);
    setAssassinWinner(winnerPlayer ? { name: winnerPlayer.displayName, avatarUrl: winnerPlayer.avatarUrl } : null);
    setSecretCount(quests.filter((quest) => quest.isSecret && quest.completedBy.length > 0).length);
    setParticipation(voteStats);
    setAwardWinners(winners);

    if (silent) setRefreshing(false);
    else setLoading(false);
  }, [state.group?.id, state.members]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshButton = (
    <Button type="button" variant="secondary" size="sm" disabled={refreshing} onClick={() => void load(true)}>
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );

  const pendingVoters = participation?.pendingVoterIds.map((voterId) => {
    const member = state.members.find((item) => (item.userId || item.id) === voterId);
    return member ? memberName(member) : voterId;
  }) ?? [];

  if (state.loading || loading) return <LoadingCard label="Preparing the ceremony..." />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Final Ceremony" title="Trip Finale" description="Designed for the final evening on a TV screen." group={state.group} action={refreshButton}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="overflow-hidden bg-surface-warm text-center">
          <p className="text-5xl">🎉</p>
          <h2 className="mt-4 font-display text-5xl font-black">Istanbul Quest Ceremony</h2>
        </Card>
      </motion.div>

      {participation && (
        <Card>
          <Badge>Vote participation</Badge>
          <p className="mt-3 text-3xl font-black">{participation.participationRate}%</p>
          <p className="text-sm text-muted-foreground">
            {participation.completedVoters} / {participation.eligibleVoters} voters finished all categories
          </p>
          <Progress value={participation.participationRate} className="mt-4" />
          {pendingVoters.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="font-black text-amber-900 dark:text-amber-200">Still voting</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{pendingVoters.join(", ")}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Everyone has completed their votes.</p>
          )}
        </Card>
      )}

      <section className="grid grid-cols-3 justify-items-center gap-2 sm:gap-4 xl:justify-items-stretch">
        <Card className="w-[140px] p-3 text-center sm:w-auto sm:p-5">
          <Badge className="text-[10px]">XP Ranking</Badge>
          {xpWinner && (
            <>
              <p className="mt-2 text-2xl sm:mt-4 sm:text-4xl">🥇</p>
              <Avatar src={xpWinner.avatarUrl} alt={xpWinner.name} className="mx-auto mt-2 h-12 w-12 sm:mt-4 sm:h-24 sm:w-24" />
              <p className="mt-2 truncate px-1 text-sm font-black sm:mt-4 sm:text-2xl">{xpWinner.name}</p>
              <p className="text-[10px] text-muted-foreground sm:text-sm">Lv {calculateLevel(xpWinner.xp)} · {xpWinner.xp} XP</p>
            </>
          )}
        </Card>
        <Card className="w-[140px] p-3 text-center sm:w-auto sm:p-5">
          <Badge className="text-[10px]">Assassin Winner</Badge>
          {assassinWinner && (
            <>
              <p className="mt-2 text-2xl sm:mt-4 sm:text-4xl">🔪</p>
              <Avatar src={assassinWinner.avatarUrl} alt={assassinWinner.name} className="mx-auto mt-2 h-12 w-12 sm:mt-4 sm:h-24 sm:w-24" />
              <p className="mt-2 truncate px-1 text-sm font-black sm:mt-4 sm:text-2xl">{assassinWinner.name}</p>
            </>
          )}
        </Card>
        <Card className="w-[140px] p-3 text-center sm:w-auto sm:p-5">
          <Badge className="text-[10px]">Secret Quests</Badge>
          <p className="mt-4 text-3xl font-black sm:mt-8 sm:text-5xl">{secretCount}</p>
          <p className="mt-1 text-[10px] text-muted-foreground sm:mt-2 sm:text-sm">discoveries unlocked</p>
        </Card>
      </section>

      <Card>
        <Badge>Awards Winners</Badge>
        <div className="mt-4 grid grid-cols-2 justify-items-center gap-2 sm:grid-cols-3 md:justify-items-stretch lg:grid-cols-3">
          {awardWinners.map((award) => (
            <div key={award.id} className="w-[200px] max-w-full rounded-3xl border border-border bg-background p-3 sm:w-auto sm:p-4">
              <p className="text-sm font-black leading-tight sm:text-base">{award.emoji} {award.title}</p>
              <p className="mt-2 text-lg font-black text-accent">{award.winnerName}</p>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
