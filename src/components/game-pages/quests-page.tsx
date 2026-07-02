"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { QUEST_CATEGORIES } from "@/lib/game-data";
import { completeQuest, ensureGroupQuests, listGroupQuests } from "@/services/quest-service";
import type { QuestCategory, QuestDoc } from "@/types/game";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

export function QuestsPage() {
  const state = useActiveGroup();
  const [quests, setQuests] = useState<QuestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockBanner, setUnlockBanner] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});

  async function load() {
    if (!state.group?.id) return;
    setLoading(true);
    const items = await ensureGroupQuests(state.group.id);
    setQuests(items);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [state.group?.id]);

  const grouped = useMemo(() => {
    const map = new Map<QuestCategory, QuestDoc[]>();
    quests.filter((quest) => !quest.isSecret || quest.unlocked).forEach((quest) => {
      const list = map.get(quest.category) ?? [];
      list.push(quest);
      map.set(quest.category, list);
    });
    return map;
  }, [quests]);

  const secretLocked = quests.filter((quest) => quest.isSecret && !quest.unlocked);

  async function handleComplete(quest: QuestDoc) {
    if (!state.group?.id || !state.userId || quest.completedBy.includes(state.userId)) return;
    const result = await completeQuest({
      groupId: state.group.id,
      quest,
      userId: state.userId,
      comment: comment[quest.id] ?? ""
    });
    if (result.unlockedSecret) setUnlockBanner(`🎉 New Secret Quest Unlocked: ${result.unlockedSecret}`);
    await load();
  }

  if (state.loading || loading) return <LoadingCard />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Quests" title="Quest Map" description="Complete quests to earn XP. No photos are stored in the app — just tap complete." group={state.group}>
      <AnimatePresence>
        {unlockBanner && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-accent bg-accent/15 text-center font-black">{unlockBanner}</Card>
          </motion.div>
        )}
      </AnimatePresence>

      {[...grouped.entries()].map(([category, items]) => (
        <Card key={category}>
          <Badge>{QUEST_CATEGORIES[category].emoji} {QUEST_CATEGORIES[category].label}</Badge>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {items.map((quest) => {
              const done = state.userId ? quest.completedBy.includes(state.userId) : false;
              return (
                <div key={quest.id} className="rounded-3xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black">{quest.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{quest.description}</p>
                    </div>
                    <Badge>{quest.xpReward} XP</Badge>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-muted-foreground">{quest.difficulty}</p>
                  {!done ? (
                    <form className="mt-4 grid gap-2" onSubmit={(event: FormEvent) => { event.preventDefault(); void handleComplete(quest); }}>
                      <input
                        placeholder="Optional comment"
                        className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold"
                        value={comment[quest.id] ?? ""}
                        onChange={(event) => setComment((prev) => ({ ...prev, [quest.id]: event.target.value }))}
                      />
                      <Button type="submit" size="sm"><Sparkles className="h-4 w-4" />Complete Quest</Button>
                    </form>
                  ) : (
                    <p className="mt-4 text-sm font-black text-success">✅ Completed</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {secretLocked.length > 0 && (
        <Card>
          <Badge>Secret Quests</Badge>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {secretLocked.map((quest) => (
              <div key={quest.id} className="rounded-3xl border border-dashed border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2 font-black"><Lock className="h-4 w-4" /> Secret Quest</div>
                <p className="mt-2 text-muted-foreground">????</p>
                <p className="mt-2 text-sm font-black">??? XP</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
