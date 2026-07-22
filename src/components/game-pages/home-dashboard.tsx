"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Crown, Map, Sparkles, Trophy } from "lucide-react";
import { Avatar, Badge, Card, Progress } from "@/components/ui";
import { filterActiveGameMembers, memberUserId } from "@/lib/game-members";
import { useActiveGroup } from "@/hooks/use-active-group";
import { listRecentActivity } from "@/services/activity-service";
import { countAwardsWonByUser, countUserVotes, subscribeAwardCeremony } from "@/services/award-service";
import { loadAssassinState } from "@/services/assassin-service";
import { listQuestCompletions } from "@/services/quest-service";
import { listXpTransactions } from "@/services/xp-service";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import { calculateLevel, getLevelProgress } from "@/lib/utils";
import type { ActivityItem } from "@/types/game";
import { EmptyGroupCard, LoadingCard } from "@/components/game-pages/page-shell";

export function HomeDashboard() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [rank, setRank] = useState(1);
  const [hasScores, setHasScores] = useState(false);
  const [questsDone, setQuestsDone] = useState(0);
  const [awardsVoted, setAwardsVoted] = useState(0);
  const [awardsWon, setAwardsWon] = useState(0);
  const [eliminations, setEliminations] = useState(0);
  const [assassinStatus, setAssassinStatus] = useState("Survivor");
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const member = state.members.find((item) => memberUserId(item) === state.userId);
  const displayName = member?.nickname || member?.username || "Traveler";
  const avatarUrl = resolveMemberAvatar(state.group, member ?? {});

  useEffect(() => {
    if (!state.group?.id || !state.userId) return;
    async function load() {
      setLoading(true);
      const groupId = state.group!.id;
      const userId = state.userId!;
      const [transactions, completions, votes, awardsWonCount, assassin, feed] = await Promise.all([
        listXpTransactions(groupId),
        listQuestCompletions(groupId),
        countUserVotes(userId, groupId),
        countAwardsWonByUser(groupId, userId),
        loadAssassinState(groupId),
        listRecentActivity(groupId).catch(() => [])
      ]);

      const userXp = transactions.filter((item) => item.userId === userId).reduce((sum, item) => sum + item.amount, 0);
      const memberXp = filterActiveGameMembers(state.members).map((item) => {
        const id = memberUserId(item);
        return { id, xp: transactions.filter((tx) => tx.userId === id).reduce((sum, tx) => sum + tx.amount, 0) };
      }).sort((a, b) => b.xp - a.xp);
      const position = memberXp.findIndex((item) => item.id === userId) + 1;
      const player = assassin.players.find((item) => item.uid === userId);

      setXp(userXp);
      setRank(position || 1);
      // Before anyone has earned XP everyone ties at 0, so "position" is really just array order,
      // not an achievement — showing "#1" then reads as "you're already winning" for nobody.
      setHasScores(memberXp.some((item) => item.xp > 0));
      setQuestsDone(completions.filter((item) => item.userId === userId).length);
      setAwardsVoted(votes.voted);
      setAwardsWon(awardsWonCount);
      setEliminations(player?.eliminationCount ?? 0);
      // No assassinPlayers doc yet means the game hasn't started (group just initialized) —
      // that's not the same as being eliminated, so it must default to Survivor, not Eliminated.
      setAssassinStatus(!player || player.isAlive ? "Survivor" : "Eliminated");
      setActivity(feed);
      setLoading(false);
    }
    void load();
  }, [state.group, state.userId, state.members]);

  // The one-shot load above only reflects awards revealed at the moment this page mounted. During
  // a live ceremony, other categories keep getting revealed while someone might already be sitting
  // on the dashboard — this keeps the "Awards won" stat in sync without needing a manual refresh.
  useEffect(() => {
    if (!state.group?.id || !state.userId) return;
    const groupId = state.group.id;
    const userId = state.userId;
    const unsubscribe = subscribeAwardCeremony(groupId, () => {
      void countAwardsWonByUser(groupId, userId).then(setAwardsWon).catch(() => undefined);
    });
    return () => unsubscribe();
  }, [state.group?.id, state.userId]);

  const level = calculateLevel(xp);
  const profileStats = useMemo(() => ([
    { label: "Ranking position", value: hasScores ? `#${rank}` : "—", icon: Trophy },
    { label: "Completed quests", value: questsDone, icon: Sparkles },
    { label: "Assassin status", value: assassinStatus, icon: Crosshair },
    { label: "Assassin eliminations", value: eliminations, icon: Map },
    { label: "Awards voted", value: awardsVoted, icon: Crown },
    { label: "Awards won", value: awardsWon, icon: Trophy }
  ]), [rank, hasScores, questsDone, assassinStatus, eliminations, awardsVoted, awardsWon]);

  if (state.loading || loading) return <LoadingCard label="Loading your adventure..." />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <div className="grid gap-4 sm:gap-6">
      <Card>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Avatar src={avatarUrl} alt={displayName} className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1">
            <Badge>Level {level}</Badge>
            <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">{displayName}</h2>
            <p className="text-sm font-semibold text-muted-foreground">{xp.toLocaleString("en")} XP</p>
          </div>
        </div>
        <Progress value={getLevelProgress(xp)} className="mt-4" />
      </Card>

      <section className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-4">
        {profileStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} className="w-[140px] min-w-0 sm:w-auto" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="p-3 sm:p-5">
                <Icon className="h-5 w-5 text-accent sm:h-6 sm:w-6" />
                <p className="mt-2 truncate text-xl font-black sm:mt-4 sm:text-3xl">{stat.value}</p>
                <p className="text-[10px] leading-tight text-muted-foreground sm:text-sm">{stat.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <Card>
        <Badge>Recent activity</Badge>
        <div className="mt-4 grid gap-3">
          {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet. Complete a quest or start assassin missions.</p>}
          {activity.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
              <p className="font-black">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
