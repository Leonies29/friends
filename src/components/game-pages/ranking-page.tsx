"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Badge, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { listXpTransactions } from "@/services/xp-service";
import { calculateLevel } from "@/lib/utils";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

export function RankingPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ id: string; name: string; avatarUrl: string; xp: number; level: number }>>([]);

  useEffect(() => {
    if (!state.group?.id) return;
    async function load() {
      setLoading(true);
      const transactions = await listXpTransactions(state.group!.id);
      const computed = state.members.map((member) => {
        const id = member.userId || member.id;
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
      setLoading(false);
    }
    void load();
  }, [state.group?.id, state.members]);

  const podium = useMemo(() => rows.slice(0, 3), [rows]);

  if (state.loading || loading) return <LoadingCard />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Ranking" title="XP Leaderboard" description="Overall ranking based on total XP." group={state.group}>
      <Card>
        <Badge>Podium</Badge>
        <div className="mt-6 grid items-end gap-4 md:grid-cols-3">
          {[1, 0, 2].map((index) => {
            const row = podium[index];
            if (!row) return <div key={index} />;
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`rounded-[2rem] border border-border bg-background p-5 text-center ${index === 0 ? "md:-translate-y-4" : ""}`}
              >
                <p className="text-4xl">{medals[index]}</p>
                <Avatar src={row.avatarUrl} alt={row.name} className="mx-auto mt-4 h-20 w-20" />
                <p className="mt-3 text-xl font-black">{row.name}</p>
                <p className="text-sm text-muted-foreground">Level {row.level}</p>
                <p className="mt-2 text-2xl font-black">{row.xp} XP</p>
              </motion.div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <Card key={row.id}>
            <div className="flex items-center gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-muted font-black">#{index + 1}</span>
              <Avatar src={row.avatarUrl} alt={row.name} />
              <div className="flex-1">
                <p className="font-black">{row.name}</p>
                <p className="text-sm text-muted-foreground">Level {row.level}</p>
              </div>
              <p className="text-xl font-black">{row.xp} XP</p>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
