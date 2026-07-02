"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { AWARD_CATEGORIES } from "@/lib/game-data";
import { castVote, countUserVotes, ensureAwardCategories, listVotes } from "@/services/award-service";
import type { AwardVote } from "@/types/game";
import { Avatar } from "@/components/ui";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

export function AwardsPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<AwardVote[]>([]);
  const [progress, setProgress] = useState({ voted: 0, white: 0, total: AWARD_CATEGORIES.length });
  const [activeAward, setActiveAward] = useState(AWARD_CATEGORIES[0]?.id ?? "");

  async function load() {
    if (!state.group?.id || !state.userId) return;
    setLoading(true);
    await ensureAwardCategories(state.group.id);
    const [allVotes, voteProgress] = await Promise.all([
      listVotes(state.group.id, state.userId),
      countUserVotes(state.userId, state.group.id)
    ]);
    setVotes(allVotes);
    setProgress(voteProgress);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [state.group?.id, state.userId]);

  const currentVote = votes.find((vote) => vote.awardId === activeAward);
  const award = AWARD_CATEGORIES.find((item) => item.id === activeAward);

  async function submitVote(targetUserId: string | null, isWhiteVote = false) {
    if (!state.group?.id || !state.userId || !activeAward) return;
    await castVote({ groupId: state.group.id, awardId: activeAward, voterId: state.userId, targetUserId, isWhiteVote });
    await load();
  }

  if (state.loading || loading) return <LoadingCard />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Awards" title="Community Awards" description="Vote for your friends. Votes stay private and can be changed anytime." group={state.group}>
      <Card>
        <Badge>Progress</Badge>
        <p className="mt-3 text-3xl font-black">{progress.voted + progress.white} / {progress.total} Awards Completed</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="grid gap-2">
          {AWARD_CATEGORIES.map((category) => {
            const vote = votes.find((item) => item.awardId === category.id);
            const status = vote?.isWhiteVote ? "⚪ White vote" : vote?.targetUserId ? "🟢 Voted" : "🕒 Not voted";
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveAward(category.id)}
                className={`rounded-2xl border px-4 py-3 text-left ${activeAward === category.id ? "border-accent bg-accent/15" : "border-border bg-background"}`}
              >
                <p className="font-black">{category.emoji} {category.title}</p>
                <p className="text-xs text-muted-foreground">{status}</p>
              </button>
            );
          })}
        </Card>

        {award && (
          <motion.div key={award.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <Badge>{award.emoji} {award.title}</Badge>
              <p className="mt-3 text-muted-foreground">{award.description}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {state.members.map((member) => (
                  <button key={member.id} type="button" className="flex items-center gap-3 rounded-3xl border border-border bg-background p-4 text-left" onClick={() => void submitVote(member.userId || member.id)}>
                    <Avatar src={member.avatarUrl ?? ""} alt={memberName(member)} />
                    <div>
                      <p className="font-black">{memberName(member)}</p>
                      <p className="text-sm text-muted-foreground">Vote</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void submitVote(state.userId ?? null)}>Vote for myself</Button>
                <Button variant="secondary" onClick={() => void submitVote(null, true)}>White vote</Button>
                <Button variant="ghost" onClick={() => setActiveAward(activeAward)}>Skip for now</Button>
              </div>
              {currentVote && (
                <p className="mt-4 text-sm font-semibold text-muted-foreground">
                  Current vote: {currentVote.isWhiteVote ? "White vote" : memberName(state.members.find((m) => (m.userId || m.id) === currentVote.targetUserId) ?? {})}
                </p>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
