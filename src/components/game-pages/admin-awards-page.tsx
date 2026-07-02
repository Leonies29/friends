"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { AWARD_CATEGORIES } from "@/lib/game-data";
import { getAwardResults } from "@/services/award-service";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

export function AdminAwardsPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [results, setResults] = useState<Map<string, Array<{ userId: string; count: number }>>>(new Map());

  useEffect(() => {
    if (!state.group?.id) return;
    async function load() {
      setLoading(true);
      const raw = await getAwardResults(state.group!.id);
      setResults(raw);
      setLoading(false);
    }
    void load();
  }, [state.group?.id]);

  const activeAward = AWARD_CATEGORIES.find((award) => award.id === revealed);
  const podium = useMemo(() => {
    if (!revealed) return [];
    const rows = results.get(revealed) ?? [];
    return rows.slice(0, 3).map((row) => {
      const member = state.members.find((item) => (item.userId || item.id) === row.userId);
      return {
        userId: row.userId,
        count: row.count,
        name: memberName(member ?? {}),
        avatarUrl: member?.avatarUrl ?? ""
      };
    });
  }, [revealed, results, state.members]);

  if (state.loading || loading) return <LoadingCard label="Loading award votes..." />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Admin" title="Awards Reveal" description="See all votes, calculate rankings, and reveal winners with ceremony animations." group={state.group}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AWARD_CATEGORIES.map((award) => (
          <Card key={award.id}>
            <Badge>{award.emoji} {award.title}</Badge>
            <p className="mt-2 text-sm text-muted-foreground">{award.description}</p>
            <Button className="mt-4" variant="secondary" onClick={() => setRevealed(award.id)}>Reveal winners</Button>
          </Card>
        ))}
      </div>

      {activeAward && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-[#f6ead8]">
            <Badge>{activeAward.emoji} {activeAward.title}</Badge>
            <div className="mt-6 grid items-end gap-4 md:grid-cols-3">
              {[1, 0, 2].map((index) => {
                const row = podium[index];
                if (!row) return <div key={index} />;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={row.userId} className={`rounded-[2rem] border border-border bg-background p-5 text-center ${index === 0 ? "md:-translate-y-4" : ""}`}>
                    <p className="text-4xl">{medals[index]}</p>
                    <Avatar src={row.avatarUrl} alt={row.name} className="mx-auto mt-4 h-20 w-20" />
                    <p className="mt-3 text-xl font-black">{row.name}</p>
                    <p className="text-sm text-muted-foreground">{row.count} votes</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}
    </PageShell>
  );
}
