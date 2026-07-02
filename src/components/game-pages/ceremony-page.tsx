"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Badge, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { getAwardResults } from "@/services/award-service";
import { loadAssassinState } from "@/services/assassin-service";
import { listGroupQuests } from "@/services/quest-service";
import { listXpTransactions } from "@/services/xp-service";
import { AWARD_CATEGORIES } from "@/lib/game-data";
import { calculateLevel } from "@/lib/utils";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

export function CeremonyPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [xpWinner, setXpWinner] = useState<{ name: string; avatarUrl: string; xp: number } | null>(null);
  const [assassinWinner, setAssassinWinner] = useState<{ name: string; avatarUrl: string } | null>(null);
  const [secretCount, setSecretCount] = useState(0);

  useEffect(() => {
    if (!state.group?.id) return;
    async function load() {
      setLoading(true);
      const groupId = state.group!.id;
      const [transactions, assassin, quests, awardResults] = await Promise.all([
        listXpTransactions(groupId),
        loadAssassinState(groupId),
        listGroupQuests(groupId),
        getAwardResults(groupId)
      ]);

      const xpRows = state.members.map((member) => {
        const id = member.userId || member.id;
        return {
          id,
          name: member.nickname || member.username || "Player",
          avatarUrl: member.avatarUrl ?? "",
          xp: transactions.filter((item) => item.userId === id).reduce((sum, item) => sum + item.amount, 0)
        };
      }).sort((a, b) => b.xp - a.xp);

      const topAssassin = [...assassin.players].sort((a, b) => b.eliminationCount - a.eliminationCount)[0];
      setXpWinner(xpRows[0] ?? null);
      setAssassinWinner(topAssassin ? { name: topAssassin.displayName, avatarUrl: topAssassin.avatarUrl } : null);
      setSecretCount(quests.filter((quest) => quest.isSecret && quest.completedBy.length > 0).length);
      setLoading(false);
    }
    void load();
  }, [state.group?.id, state.members]);

  if (state.loading || loading) return <LoadingCard label="Preparing the ceremony..." />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Final Ceremony" title="Trip Finale" description="Designed for the final evening on a TV screen." group={state.group}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="overflow-hidden bg-[#f6ead8] text-center">
          <p className="text-5xl">🎉</p>
          <h2 className="mt-4 font-display text-5xl font-black">Istanbul Quest Ceremony</h2>
        </Card>
      </motion.div>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="text-center">
          <Badge>XP Ranking</Badge>
          {xpWinner && (
            <>
              <p className="mt-4 text-4xl">🥇</p>
              <Avatar src={xpWinner.avatarUrl} alt={xpWinner.name} className="mx-auto mt-4 h-24 w-24" />
              <p className="mt-4 text-2xl font-black">{xpWinner.name}</p>
              <p className="text-muted-foreground">Level {calculateLevel(xpWinner.xp)} · {xpWinner.xp} XP</p>
            </>
          )}
        </Card>
        <Card className="text-center">
          <Badge>Assassin Winner</Badge>
          {assassinWinner && (
            <>
              <p className="mt-4 text-4xl">🔪</p>
              <Avatar src={assassinWinner.avatarUrl} alt={assassinWinner.name} className="mx-auto mt-4 h-24 w-24" />
              <p className="mt-4 text-2xl font-black">{assassinWinner.name}</p>
            </>
          )}
        </Card>
        <Card className="text-center">
          <Badge>Secret Quests</Badge>
          <p className="mt-8 text-5xl font-black">{secretCount}</p>
          <p className="mt-2 text-muted-foreground">discoveries unlocked</p>
        </Card>
      </section>

      <Card>
        <Badge>Awards Winners</Badge>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {AWARD_CATEGORIES.slice(0, 6).map((award) => (
            <div key={award.id} className="rounded-3xl border border-border bg-background p-4">
              <p className="font-black">{award.emoji} {award.title}</p>
              <p className="text-sm text-muted-foreground">Reveal from Admin when ready</p>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
