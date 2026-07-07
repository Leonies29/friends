"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { QUEST_CATEGORIES } from "@/lib/game-data";
import { cn } from "@/lib/utils";
import { completeQuest, ensureGroupQuests } from "@/services/quest-service";
import type { QuestCategory, QuestDoc } from "@/types/game";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

type StatusFilter = "todo" | "done" | "all";
type CategoryFilter = QuestCategory | "all" | "secrets";

const questGridClass = "grid grid-cols-[repeat(auto-fill,minmax(280px,300px))] justify-center gap-3 md:justify-start";
const CATEGORY_ORDER = Object.keys(QUEST_CATEGORIES) as QuestCategory[];

function isQuestDone(quest: QuestDoc, userId: string | null | undefined) {
  return Boolean(userId && quest.completedBy.includes(userId));
}

function isQuestVisible(quest: QuestDoc) {
  return !quest.isSecret || quest.unlocked;
}

function QuestCard({
  quest,
  done,
  comment,
  onCommentChange,
  onComplete
}: {
  quest: QuestDoc;
  done: boolean;
  comment: string;
  onCommentChange: (value: string) => void;
  onComplete: () => void;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-[300px] rounded-3xl border p-4",
        done ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-border bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black leading-tight">{quest.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{quest.description}</p>
        </div>
        <Badge>{quest.xpReward} XP</Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge className="text-[10px]">{QUEST_CATEGORIES[quest.category].emoji} {QUEST_CATEGORIES[quest.category].label}</Badge>
        <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">{quest.difficulty}</span>
        {quest.isSecret && <Badge className="text-[10px]">Secret</Badge>}
      </div>
      {done ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Completed
        </p>
      ) : (
        <form
          className="mt-4 grid gap-2"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onComplete();
          }}
        >
          <input
            placeholder="Optional comment"
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold"
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
          />
          <Button type="submit" size="sm">
            <Sparkles className="h-4 w-4" />
            Complete Quest
          </Button>
        </form>
      )}
    </div>
  );
}

export function QuestsPage() {
  const state = useActiveGroup();
  const [quests, setQuests] = useState<QuestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockBanner, setUnlockBanner] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todo");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  async function load() {
    if (!state.group?.id) return;
    setLoading(true);
    const items = await ensureGroupQuests(state.group.id);
    setQuests(items);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [state.group?.id]);

  const visibleQuests = useMemo(() => quests.filter(isQuestVisible), [quests]);
  const secretLocked = useMemo(() => quests.filter((quest) => quest.isSecret && !quest.unlocked), [quests]);

  const summary = useMemo(() => {
    const doneQuests = visibleQuests.filter((quest) => isQuestDone(quest, state.userId));
    return {
      done: doneQuests.length,
      total: visibleQuests.length,
      todo: visibleQuests.length - doneQuests.length,
      xp: doneQuests.reduce((sum, quest) => sum + quest.xpReward, 0)
    };
  }, [visibleQuests, state.userId]);

  const categoryStats = useMemo(() => {
    const stats = new Map<CategoryFilter, { done: number; total: number }>();
    stats.set("all", { done: summary.done, total: summary.total });
    stats.set("secrets", { done: 0, total: secretLocked.length });

    CATEGORY_ORDER.forEach((category) => {
      const items = visibleQuests.filter((quest) => quest.category === category);
      stats.set(category, {
        done: items.filter((quest) => isQuestDone(quest, state.userId)).length,
        total: items.length
      });
    });

    return stats;
  }, [visibleQuests, secretLocked.length, state.userId, summary.done, summary.total]);

  const filteredQuests = useMemo(() => {
    if (categoryFilter === "secrets") return [];

    let items = categoryFilter === "all"
      ? visibleQuests
      : visibleQuests.filter((quest) => quest.category === categoryFilter);

    if (statusFilter === "todo") {
      items = items.filter((quest) => !isQuestDone(quest, state.userId));
    } else if (statusFilter === "done") {
      items = items.filter((quest) => isQuestDone(quest, state.userId));
    }

    return [...items].sort((a, b) => {
      const aDone = isQuestDone(a, state.userId);
      const bDone = isQuestDone(b, state.userId);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.title.localeCompare(b.title);
    });
  }, [visibleQuests, categoryFilter, statusFilter, state.userId]);

  async function handleComplete(quest: QuestDoc) {
    if (!state.group?.id || !state.userId || isQuestDone(quest, state.userId)) return;
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

  const activeCategoryLabel = categoryFilter === "all"
    ? "All categories"
    : categoryFilter === "secrets"
      ? "Secret quests"
      : QUEST_CATEGORIES[categoryFilter].label;

  return (
    <PageShell
      eyebrow="Quests"
      title="Quest Map"
      description="Filter by category and focus on what's left to do."
      group={state.group}
    >
      <AnimatePresence>
        {unlockBanner && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-accent bg-accent/15 text-center font-black">{unlockBanner}</Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge>Your progress</Badge>
            <p className="mt-2 text-3xl font-black">
              {summary.done}/{summary.total}
            </p>
            <p className="text-sm text-muted-foreground">{summary.xp.toLocaleString()} XP earned from quests</p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Remaining</p>
            <p className="text-2xl font-black text-accent">{summary.todo}</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Show</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {([
            ["todo", `To do (${summary.todo})`],
            ["done", `Completed (${summary.done})`],
            ["all", `All (${summary.total})`]
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={statusFilter === value ? "primary" : "secondary"}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-wide text-muted-foreground">Category</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-xs font-black transition",
              categoryFilter === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            )}
          >
            All {categoryStats.get("all")?.done}/{categoryStats.get("all")?.total}
          </button>
          {CATEGORY_ORDER.map((category) => {
            const stat = categoryStats.get(category)!;
            const meta = QUEST_CATEGORIES[category];
            return (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-black transition",
                  categoryFilter === category
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground"
                )}
              >
                {meta.emoji} {stat.done}/{stat.total}
              </button>
            );
          })}
          {secretLocked.length > 0 && (
            <button
              type="button"
              onClick={() => setCategoryFilter("secrets")}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-xs font-black transition",
                categoryFilter === "secrets"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              )}
            >
              🔒 Locked {secretLocked.length}
            </button>
          )}
        </div>
      </Card>

      {categoryFilter === "secrets" ? (
        <Card>
          <Badge>Secret quests</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete more quests to unlock hidden missions.
          </p>
          <div className={cn(questGridClass, "mt-4")}>
            {secretLocked.map((quest) => (
              <div key={quest.id} className="w-full max-w-[300px] rounded-3xl border border-dashed border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2 font-black">
                  <Lock className="h-4 w-4" />
                  Secret Quest
                </div>
                <p className="mt-2 text-muted-foreground">????</p>
                <p className="mt-2 text-sm font-black">??? XP</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge>{activeCategoryLabel}</Badge>
            <p className="text-sm font-semibold text-muted-foreground">
              {filteredQuests.length} quest{filteredQuests.length === 1 ? "" : "s"}
            </p>
          </div>

          {filteredQuests.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
              {statusFilter === "todo"
                ? "Nothing left here — nice work! Try another category or check completed quests."
                : statusFilter === "done"
                  ? "No completed quests in this category yet."
                  : "No quests in this category."}
            </p>
          ) : (
            <div className={cn(questGridClass, "mt-4")}>
              {filteredQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  done={isQuestDone(quest, state.userId)}
                  comment={comment[quest.id] ?? ""}
                  onCommentChange={(value) => setComment((prev) => ({ ...prev, [quest.id]: value }))}
                  onComplete={() => void handleComplete(quest)}
                />
              ))}
            </div>
          )}
        </Card>
      )}
    </PageShell>
  );
}
