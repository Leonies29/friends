"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Crosshair, Crown, Map, Sparkles, Trophy } from "lucide-react";
import { Avatar, Badge, Button, Card, Progress } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { listRecentActivity } from "@/services/activity-service";
import { countUserVotes } from "@/services/award-service";
import { loadAssassinState } from "@/services/assassin-service";
import { listQuestCompletions } from "@/services/quest-service";
import { listXpTransactions } from "@/services/xp-service";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import { calculateLevel, getLevelProgress } from "@/lib/utils";
import type { ActivityItem } from "@/types/game";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

export function HomeDashboard() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [rank, setRank] = useState(1);
  const [questsDone, setQuestsDone] = useState(0);
  const [awardsVoted, setAwardsVoted] = useState(0);
  const [eliminations, setEliminations] = useState(0);
  const [assassinStatus, setAssassinStatus] = useState("Survivor");
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const member = state.members.find((item) => item.id === state.userId || item.userId === state.userId);
  const displayName = member?.nickname || member?.username || "Traveler";
  const avatarUrl = resolveMemberAvatar(state.group, member ?? {});

  useEffect(() => {
    if (!state.group?.id || !state.userId) return;
    async function load() {
      setLoading(true);
      const groupId = state.group!.id;
      const userId = state.userId!;
      const [transactions, completions, votes, assassin, feed] = await Promise.all([
        listXpTransactions(groupId),
        listQuestCompletions(groupId),
        countUserVotes(userId, groupId),
        loadAssassinState(groupId),
        listRecentActivity(groupId).catch(() => [])
      ]);

      const userXp = transactions.filter((item) => item.userId === userId).reduce((sum, item) => sum + item.amount, 0);
      const memberXp = state.members.map((item) => {
        const id = item.userId || item.id;
        return { id, xp: transactions.filter((tx) => tx.userId === id).reduce((sum, tx) => sum + tx.amount, 0) };
      }).sort((a, b) => b.xp - a.xp);
      const position = memberXp.findIndex((item) => item.id === userId) + 1;
      const player = assassin.players.find((item) => item.uid === userId);

      setXp(userXp);
      setRank(position || 1);
      setQuestsDone(completions.filter((item) => item.userId === userId).length);
      setAwardsVoted(votes.voted);
      setEliminations(player?.eliminationCount ?? 0);
      setAssassinStatus(player?.isAlive ? "Survivor" : "Eliminated");
      setActivity(feed);
      setLoading(false);
    }
    void load();
  }, [state.group?.id, state.userId, state.members]);

  const level = calculateLevel(xp);
  const profileStats = useMemo(() => ([
    { label: "Completed quests", value: questsDone, icon: Sparkles },
    { label: "Assassin eliminations", value: eliminations, icon: Crosshair },
    { label: "Awards voted", value: awardsVoted, icon: Crown }
  ]), [questsDone, eliminations, awardsVoted]);

  const quickStats = useMemo(() => ([
    { label: "Ranking position", value: `#${rank}`, icon: Trophy },
    { label: "Completed quests", value: String(questsDone), icon: Map },
    { label: "Awards voted", value: String(awardsVoted), icon: Crown },
    { label: "Assassin status", value: assassinStatus, icon: Crosshair }
  ]), [rank, questsDone, awardsVoted, assassinStatus]);

  if (state.loading || loading) return <LoadingCard label="Loading your adventure..." />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Home" title="Istanbul Quest" description="Your profile and central dashboard for the trip adventure." group={state.group}>
      <Card>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Avatar src={avatarUrl} alt={displayName} className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1">
            <Badge>Level {level}</Badge>
            <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">{displayName}</h2>
            <p className="text-sm font-semibold text-muted-foreground">{xp.toLocaleString()} XP</p>
          </div>
        </div>
        <Progress value={getLevelProgress(xp)} className="mt-4" />
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        {profileStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card>
                <Icon className="h-6 w-6 text-accent" />
                <p className="mt-3 text-2xl font-black sm:mt-4 sm:text-3xl">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={`quick-${stat.label}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card>
                <Icon className="h-6 w-6 text-accent" />
                <p className="mt-4 text-2xl font-black">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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

        <Card>
          <Badge>Quick actions</Badge>
          <div className="mt-4 grid gap-3">
            <Button asChild><Link href="/questline">Open quests</Link></Button>
            <Button asChild variant="secondary"><Link href="/assassin">Open assassin</Link></Button>
            <Button asChild variant="secondary"><Link href="/awards">Open awards</Link></Button>
            <Button asChild variant="secondary"><Link href="/photos"><Camera className="h-4 w-4" />Open travel album</Link></Button>
            <Button asChild variant="secondary"><Link href="/ceremony">Final ceremony</Link></Button>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
