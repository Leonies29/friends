"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Badge, Card } from "@/components/ui";
import { filterActiveGameMembers, memberUserId } from "@/lib/game-members";
import { useActiveGroup } from "@/hooks/use-active-group";
import { listXpTransactions } from "@/services/xp-service";
import { listGames } from "@/services/game-service";
import { getTeamXpTotalsForGame, listGameTeamMemberships, listTeams } from "@/services/team-service";
import { calculateLevel } from "@/lib/utils";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

type TeamGameRanking = {
  gameId: string;
  gameTitle: string;
  teams: Array<{ id: string; name: string; xp: number }>;
};

export function RankingPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ id: string; name: string; avatarUrl: string; xp: number; level: number }>>([]);
  const [teamGameRankings, setTeamGameRankings] = useState<TeamGameRanking[]>([]);

  useEffect(() => {
    if (!state.group?.id) return;
    async function load() {
      setLoading(true);
      const groupId = state.group!.id;
      const transactions = await listXpTransactions(groupId);
      const computed = filterActiveGameMembers(state.members).map((member) => {
        const id = memberUserId(member);
        const xp = transactions.filter((item) => item.userId === id).reduce((sum, item) => sum + item.amount, 0);
        return {
          id,
          name: memberName(member),
          avatarUrl: member.avatarUrl ?? "",
          xp,
          level: calculateLevel(xp)
        };
      }).sort((a, b) => b.xp - a.xp);
      setRows(computed);

      const games = await listGames(groupId);
      const teamGames = games.filter((game) => game.settings?.scoringMode === "team");
      const rankings = await Promise.all(teamGames.map(async (game) => {
        const [teams, memberships] = await Promise.all([
          listTeams(groupId, game.id),
          listGameTeamMemberships(groupId, game.id)
        ]);
        const totals = getTeamXpTotalsForGame(game.id, memberships, transactions);
        return {
          gameId: game.id,
          gameTitle: game.title,
          teams: teams
            .map((team) => ({ id: team.id, name: team.name, xp: totals.get(team.id) ?? 0 }))
            .sort((a, b) => b.xp - a.xp)
        };
      }));
      setTeamGameRankings(rankings.filter((ranking) => ranking.teams.length > 0));

      setLoading(false);
    }
    void load();
  }, [state.group, state.members]);

  const podium = useMemo(() => rows.slice(0, 3), [rows]);
  // Before anyone has earned XP, every row ties at 0 — sorting still hands out gold/silver/bronze
  // to whoever happens to come first, which reads as "these people already won" and confuses
  // players. Medals and rank numbers only make sense once someone actually has points.
  const hasIndividualScores = rows.some((row) => row.xp > 0);

  if (state.loading || loading) return <LoadingCard />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Ranking" title="XP Leaderboard" description="Overall ranking based on total XP." group={state.group}>
      {teamGameRankings.map((ranking) => {
        const hasTeamScores = ranking.teams.some((team) => team.xp > 0);
        return (
          <Card key={ranking.gameId}>
            <Badge>Team ranking — {ranking.gameTitle}</Badge>
            <div className="mt-4 grid gap-2">
              {ranking.teams.map((team, index) => (
                <div key={team.id} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    {hasTeamScores && <span className="grid h-9 w-9 place-items-center rounded-2xl bg-muted text-sm font-black">#{index + 1}</span>}
                    <p className="font-black">{team.name}</p>
                  </div>
                  <p className="text-lg font-black">{team.xp} XP</p>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <Card>
        <Badge>{teamGameRankings.length > 0 ? "Individual podium" : "Podium"}</Badge>
        {hasIndividualScores ? (
          <div className="mt-6 flex items-end justify-center gap-1.5 sm:gap-3">
            {([1, 0, 2] as const).map((rankIndex, slotIndex) => {
              const row = podium[rankIndex];
              if (!row) return <div key={rankIndex} className="w-[140px] shrink-0" aria-hidden />;
              const medals = ["🥇", "🥈", "🥉"];
              const isFirst = rankIndex === 0;
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: slotIndex * 0.08 }}
                  className={`w-[140px] shrink-0 rounded-[1.25rem] border border-border bg-background p-2.5 text-center sm:rounded-[2rem] sm:p-4 ${
                    isFirst ? "-translate-y-2 sm:-translate-y-4" : ""
                  }`}
                >
                  <p className="text-xl sm:text-4xl">{medals[rankIndex]}</p>
                  <Avatar src={row.avatarUrl} alt={row.name} className="mx-auto mt-1.5 h-11 w-11 sm:mt-4 sm:h-20 sm:w-20" />
                  <p className="mt-1.5 truncate px-0.5 text-xs font-black sm:mt-3 sm:text-xl">{row.name}</p>
                  <p className="text-[10px] text-muted-foreground sm:text-sm">Level {row.level}</p>
                  <p className="mt-0.5 text-sm font-black sm:mt-2 sm:text-2xl">{row.xp} XP</p>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No one has earned XP yet — the podium unlocks as soon as the first points are scored.</p>
        )}
      </Card>

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <Card key={row.id}>
            <div className="flex items-center gap-3 sm:gap-4">
              {hasIndividualScores && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-muted text-sm font-black sm:h-10 sm:w-10">#{index + 1}</span>}
              <Avatar src={row.avatarUrl} alt={row.name} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{row.name}</p>
                <p className="text-sm text-muted-foreground">Level {row.level}</p>
              </div>
              <p className="shrink-0 text-lg font-black sm:text-xl">{row.xp} XP</p>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
