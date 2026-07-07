"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import type { GroupMember } from "@/hooks/use-active-group";
import { AWARD_CATEGORIES } from "@/lib/game-data";
import { getAwardResults, getVoteParticipationStats, listAwardCategories, updateAwardCategoryVisibility } from "@/services/award-service";
import { filterActiveGameMembers } from "@/lib/game-members";
import type { AwardCategory } from "@/types/game";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

export function AwardsRevealSection({
  groupId,
  members,
  embedded = false
}: {
  groupId: string;
  members: GroupMember[];
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [results, setResults] = useState<Map<string, Array<{ userId: string; count: number }>>>(new Map());
  const [categories, setCategories] = useState<Array<AwardCategory & { groupId?: string }>>(AWARD_CATEGORIES);
  const [participation, setParticipation] = useState<Awaited<ReturnType<typeof getVoteParticipationStats>> | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    const memberIds = filterActiveGameMembers(members).map((member) => member.userId || member.id);
    void Promise.all([
      getAwardResults(groupId),
      listAwardCategories(groupId),
      getVoteParticipationStats(groupId, memberIds)
    ])
      .then(([raw, loadedCategories, stats]) => {
        setResults(raw);
        setCategories(loadedCategories);
        setParticipation(stats);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load votes."))
      .finally(() => setLoading(false));
  }, [groupId, members]);

  const activeAward = categories.find((award) => award.id === revealed);
  const podium = useMemo(() => {
    if (!revealed) return [];
    const rows = results.get(revealed) ?? [];
    return rows.slice(0, 3).map((row) => {
      const member = members.find((item) => (item.userId || item.id) === row.userId);
      return {
        userId: row.userId,
        count: row.count,
        name: memberName(member ?? {}),
        avatarUrl: member?.avatarUrl ?? ""
      };
    });
  }, [revealed, results, members]);

  const body = (
    <>
      {!embedded && (
        <>
          <Badge>Ceremony</Badge>
          <p className="mt-2 text-sm text-muted-foreground">Reveal award winners when everyone has voted.</p>
        </>
      )}
      {loading && <p className={`text-sm text-muted-foreground ${embedded ? "" : "mt-4"}`}>Loading votes...</p>}
      {error && <p className="mt-4 text-sm font-semibold text-rose-700">{error}</p>}
      {!loading && !error && (
        <>
          {participation && (
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <p className="font-black">Vote participation: {participation.participationRate}%</p>
              <p className="text-sm text-muted-foreground">
                {participation.completedVoters}/{participation.eligibleVoters} finished · {participation.pendingVoterIds.length} still voting
              </p>
              {participation.pendingVoterIds.length > 0 && (
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Waiting: {participation.pendingVoterIds.map((id) => memberName(members.find((m) => (m.userId || m.id) === id) ?? {})).join(", ")}
                </p>
              )}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((award) => (
              <div key={award.id} className={`rounded-2xl border p-4 ${revealed === award.id ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                <button type="button" onClick={() => setRevealed(award.id)} className="w-full text-left">
                  <p className="font-black">{award.emoji} {award.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{award.description}</p>
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => void updateAwardCategoryVisibility(award.id, award.visible === false).then(() => {
                    setCategories((items) => items.map((item) => item.id === award.id ? { ...item, visible: award.visible === false } : item));
                  })}
                >
                  {award.visible === false ? "Show category" : "Hide category"}
                </Button>
              </div>
            ))}
          </div>

          {activeAward && podium.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-border bg-surface-warm p-5">
              <p className="font-black">{activeAward.emoji} {activeAward.title}</p>
              <div className="mt-4 grid items-end gap-3 md:grid-cols-3">
                {[1, 0, 2].map((index) => {
                  const row = podium[index];
                  if (!row) return <div key={index} />;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={row.userId} className={`rounded-2xl border border-border bg-background p-4 text-center ${index === 0 ? "md:-translate-y-2" : ""}`}>
                      <p className="text-3xl">{medals[index]}</p>
                      <Avatar src={row.avatarUrl} alt={row.name} className="mx-auto mt-3 h-16 w-16" />
                      <p className="mt-2 font-black">{row.name}</p>
                      <p className="text-sm text-muted-foreground">{row.count} votes</p>
                    </div>
                  );
                })}
              </div>
              <Button className="mt-4" variant="secondary" size="sm" onClick={() => setRevealed(null)}>Close reveal</Button>
            </motion.div>
          )}
        </>
      )}
    </>
  );

  return embedded ? body : <Card>{body}</Card>;
}
