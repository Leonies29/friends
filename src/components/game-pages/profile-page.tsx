"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Sparkles, Trophy } from "lucide-react";
import { Avatar, Badge, Card, Progress } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { countAwardsWonByUser } from "@/services/award-service";
import { loadAssassinState } from "@/services/assassin-service";
import { listQuestCompletions } from "@/services/quest-service";
import { listXpTransactions } from "@/services/xp-service";
import { calculateLevel, getLevelProgress } from "@/lib/utils";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

export function ProfilePage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [questsDone, setQuestsDone] = useState(0);
  const [eliminations, setEliminations] = useState(0);
  const [awardsWon, setAwardsWon] = useState(0);

  const member = state.members.find((item) => item.id === state.userId || item.userId === state.userId);
  const displayName = member?.nickname || member?.username || "Traveler";
  const avatarUrl = resolveMemberAvatar(state.group, member ?? {});

  useEffect(() => {
    if (!state.group?.id || !state.userId) return;
    async function load() {
      setLoading(true);
      const groupId = state.group!.id;
      const userId = state.userId!;
      const [transactions, completions, assassin, awardsWonCount] = await Promise.all([
        listXpTransactions(groupId),
        listQuestCompletions(groupId),
        loadAssassinState(groupId),
        countAwardsWonByUser(groupId, userId)
      ]);
      const userXp = transactions.filter((item) => item.userId === userId).reduce((sum, item) => sum + item.amount, 0);
      const player = assassin.players.find((item) => item.uid === userId);
      setXp(userXp);
      setQuestsDone(completions.filter((item) => item.userId === userId).length);
      setEliminations(player?.eliminationCount ?? 0);
      setAwardsWon(awardsWonCount);
      setLoading(false);
    }
    void load();
  }, [state.group?.id, state.userId]);

  const level = calculateLevel(xp);
  const stats = [
    { label: "Completed quests", value: questsDone, icon: Sparkles },
    { label: "Assassin eliminations", value: eliminations, icon: Crosshair },
    { label: "Awards won", value: awardsWon, icon: Trophy }
  ];

  if (state.loading || loading) return <LoadingCard label="Loading profile..." />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Profile" title={displayName} description="Your Istanbul Quest identity. Group photos are built into the app for the Istanbul trip." group={state.group}>
      <Card>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar src={avatarUrl} alt={displayName} className="h-28 w-28" />
          <div className="flex-1">
            <Badge>Level {level}</Badge>
            <h2 className="mt-2 text-3xl font-black">{displayName}</h2>
            <p className="text-sm font-semibold text-muted-foreground">{xp.toLocaleString()} XP</p>
            <p className="mt-3 text-sm text-muted-foreground">Fixed profile photo for the Istanbul group.</p>
          </div>
        </div>
        <Progress value={getLevelProgress(xp)} className="mt-5" />
      </Card>

      <section className="grid grid-cols-3 justify-items-center gap-1.5 sm:justify-items-stretch sm:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} className="w-[140px] min-w-0 sm:w-auto" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="p-3 sm:p-5">
                <Icon className="h-5 w-5 text-accent sm:h-6 sm:w-6" />
                <p className="mt-2 text-xl font-black sm:mt-4 sm:text-3xl">{stat.value}</p>
                <p className="text-[10px] leading-tight text-muted-foreground sm:text-sm">{stat.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </section>
    </PageShell>
  );
}
