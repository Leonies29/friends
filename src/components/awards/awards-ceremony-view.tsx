"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { ConfettiBurst } from "@/components/awards/confetti-burst";
import { filterActiveGameMembers } from "@/lib/game-members";
import type { GroupMember } from "@/hooks/use-active-group";
import {
  advanceAwardCeremony,
  getAwardResults,
  getVoteParticipationStats,
  listAwardCategories,
  revealAwardCeremonyWinner,
  startAwardCeremony,
  subscribeAwardCeremony
} from "@/services/award-service";
import type { AwardCategory, AwardCeremonyDoc } from "@/types/game";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

export function AwardsCeremonyView({
  groupId,
  members,
  canManage
}: {
  groupId: string;
  members: GroupMember[];
  canManage: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [results, setResults] = useState<Map<string, Array<{ userId: string; count: number }>>>(new Map());
  const [participation, setParticipation] = useState<Awaited<ReturnType<typeof getVoteParticipationStats>> | null>(null);
  const [ceremony, setCeremony] = useState<AwardCeremonyDoc | null>(null);
  const [starting, setStarting] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    setLoading(true);
    const memberIds = filterActiveGameMembers(members).map((member) => member.userId || member.id);
    void Promise.all([
      listAwardCategories(groupId),
      getAwardResults(groupId),
      getVoteParticipationStats(groupId, memberIds)
    ]).then(([loadedCategories, loadedResults, stats]) => {
      setCategories(loadedCategories);
      setResults(loadedResults);
      setParticipation(stats);
      setLoading(false);
    });
  }, [groupId, members]);

  useEffect(() => subscribeAwardCeremony(groupId, setCeremony), [groupId]);

  const eligibleCategories = useMemo(
    () => categories.filter((category) => category.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories]
  );

  const orderedCategories = useMemo(() => {
    if (!ceremony?.orderedCategoryIds?.length) return eligibleCategories;
    return ceremony.orderedCategoryIds
      .map((id) => categories.find((category) => category.id === id))
      .filter((category): category is AwardCategory => Boolean(category));
  }, [ceremony, categories, eligibleCategories]);

  const step = ceremony?.step ?? 0;
  const currentCategory = orderedCategories[step];
  const isLastStep = step >= orderedCategories.length - 1;
  const isRevealed = ceremony?.phase === "revealed";

  const rankedEntries = useMemo(() => {
    if (!currentCategory) return [];
    const rows = results.get(currentCategory.id) ?? [];
    return rows.map((row) => {
      const member = members.find((item) => (item.userId || item.id) === row.userId);
      return { userId: row.userId, count: row.count, name: memberName(member ?? {}), avatarUrl: member?.avatarUrl ?? "" };
    });
  }, [currentCategory, results, members]);
  const podium = rankedEntries.slice(0, 3);

  async function handleStart() {
    setStarting(true);
    await startAwardCeremony(groupId, orderedCategories.map((category) => category.id));
    setStarting(false);
  }

  async function handleReveal() {
    if (!currentCategory) return;
    setAdvancing(true);
    await revealAwardCeremonyWinner(groupId, currentCategory.id);
    setAdvancing(false);
  }

  async function handleNext() {
    setAdvancing(true);
    await advanceAwardCeremony(groupId, step + 1, isLastStep);
    setAdvancing(false);
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Loading the ceremony...</p>
      </Card>
    );
  }

  const status = ceremony?.status ?? "idle";

  if (status === "idle") {
    return (
      <Card className="text-center">
        <p className="text-4xl">🎬</p>
        <h3 className="mt-3 text-2xl font-black">Awards Ceremony</h3>
        <p className="mt-2 text-muted-foreground">
          Results stay hidden until the ceremony officially starts — {orderedCategories.length} categor{orderedCategories.length === 1 ? "y" : "ies"} ready to reveal.
        </p>
        {participation && (
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            Vote participation: {participation.participationRate}% ({participation.completedVoters}/{participation.eligibleVoters})
          </p>
        )}
        {canManage ? (
          <Button className="mt-5" disabled={starting || !orderedCategories.length} onClick={() => void handleStart()}>
            {starting ? "Starting..." : "🎬 Launch the ceremony"}
          </Button>
        ) : (
          <p className="mt-5 text-sm font-semibold text-muted-foreground">Waiting for the host to launch the ceremony...</p>
        )}
      </Card>
    );
  }

  if (status === "complete") {
    return (
      <div className="grid gap-4">
        <Card className="relative overflow-hidden text-center">
          <ConfettiBurst />
          <p className="text-5xl">🏆</p>
          <h3 className="mt-3 text-3xl font-black">Ceremony complete!</h3>
          <p className="mt-2 text-muted-foreground">Here are all the winners of the trip.</p>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orderedCategories.map((category) => {
            const winner = (results.get(category.id) ?? [])[0];
            const member = winner ? members.find((item) => (item.userId || item.id) === winner.userId) : null;
            return (
              <Card key={category.id}>
                <p className="font-black">{category.emoji} {category.title}</p>
                <p className="mt-2 text-lg font-black text-accent">{member ? memberName(member) : "—"}</p>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">No category to reveal.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <Badge>Round {step + 1} / {orderedCategories.length}</Badge>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentCategory.id}-${isRevealed ? "revealed" : "suspense"}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="relative overflow-hidden text-center">
            {isRevealed && <ConfettiBurst />}
            <p className="text-5xl">{currentCategory.emoji}</p>
            <h3 className="mt-3 text-3xl font-black">{currentCategory.title}</h3>
            <p className="mt-2 text-muted-foreground">{currentCategory.description}</p>

            {!isRevealed ? (
              <motion.p
                className="mt-8 text-2xl font-black text-muted-foreground"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                🤫 The votes are sealed...
              </motion.p>
            ) : podium.length > 0 ? (
              <div className="mt-6 grid items-end gap-3 md:grid-cols-3">
                {[1, 0, 2].map((index) => {
                  const row = podium[index];
                  if (!row) return <div key={index} />;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <motion.div
                      key={row.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index === 0 ? 0.3 : 0.1 }}
                      className={`rounded-2xl border border-border bg-background p-4 ${index === 0 ? "md:-translate-y-2" : ""}`}
                    >
                      <p className="text-3xl">{medals[index]}</p>
                      <Avatar src={row.avatarUrl} alt={row.name} className="mx-auto mt-3 h-16 w-16" />
                      <p className="mt-2 font-black">{row.name}</p>
                      <p className="text-sm text-muted-foreground">{row.count} vote{row.count === 1 ? "" : "s"}</p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-muted-foreground">No votes were cast for this category.</p>
            )}

            {canManage && (
              <div className="mt-6 flex justify-center gap-2">
                {!isRevealed ? (
                  <Button disabled={advancing} onClick={() => void handleReveal()}>
                    {advancing ? "Revealing..." : "🏆 Reveal the winner"}
                  </Button>
                ) : (
                  <Button disabled={advancing} onClick={() => void handleNext()}>
                    {advancing ? "Loading..." : isLastStep ? "🏁 Finish the ceremony" : "➡️ Next category"}
                  </Button>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
