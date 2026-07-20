"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge, Button, Card } from "@/components/ui";
import { filterActiveGameMembers } from "@/lib/game-members";
import { useActiveGroup } from "@/hooks/use-active-group";
import { listGames } from "@/services/game-service";
import { canManageGames } from "@/services/permissions";
import { castVote, countUserVotes, ensureAwardCategories, listAwardCategories, listVotes } from "@/services/award-service";
import type { AwardCategory, AwardVote } from "@/types/game";
import { Avatar } from "@/components/ui";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

export function AwardsPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<AwardVote[]>([]);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [progress, setProgress] = useState({ voted: 0, white: 0, total: 0 });
  const [activeAward, setActiveAward] = useState("");
  const [viewMode, setViewMode] = useState<"classic" | "quiz">("classic");
  const [quizIndex, setQuizIndex] = useState(0);
  const [showQuizComplete, setShowQuizComplete] = useState(false);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.visible !== false),
    [categories]
  );

  function preserveScrollPosition() {
    if (typeof window === "undefined") return;
    const currentTop = window.scrollY;
    requestAnimationFrame(() => window.scrollTo({ top: currentTop, behavior: "auto" }));
  }

  async function load() {
    if (!state.group?.id || !state.userId) return;
    setLoading(true);
    if (canManageGames(state.currentMember?.role)) {
      await ensureAwardCategories(state.group.id).catch(() => undefined);
    }
    const [allCategories, allVotes, voteProgress] = await Promise.all([
      listAwardCategories(state.group.id),
      listVotes(state.group.id, state.userId),
      countUserVotes(state.userId, state.group.id)
    ]);
    const visible = allCategories.filter((category) => category.visible !== false);
    setCategories(allCategories);
    setVotes(allVotes);
    setProgress(voteProgress);
    setActiveAward((current) => current || visible[0]?.id || "");
    setLoading(false);
    preserveScrollPosition();
  }

  useEffect(() => { void load(); }, [state.group?.id, state.userId]);

  useEffect(() => {
    if (!state.group?.id) return;
    void listGames(state.group.id).then((games) => {
      const awardsGame = games.find((game) => game.title.toLowerCase().includes("award") && !game.archived);
      if (awardsGame?.settings?.awardsFormat === "quiz") {
        setViewMode("quiz");
      }
    });
  }, [state.group?.id]);

  const currentVote = votes.find((vote) => vote.awardId === activeAward);
  const award = visibleCategories.find((item) => item.id === activeAward);
  const quizAward = visibleCategories[quizIndex];

  async function submitVote(targetUserId: string | null, isWhiteVote = false, awardId = activeAward) {
    if (!state.group?.id || !state.userId || !awardId) return;
    preserveScrollPosition();
    await castVote({ groupId: state.group.id, awardId, voterId: state.userId, targetUserId, isWhiteVote });
    await load();
  }

  async function submitQuizVote(targetUserId: string | null, isWhiteVote = false) {
    if (!quizAward) return;
    preserveScrollPosition();
    await submitVote(targetUserId, isWhiteVote, quizAward.id);
    if (quizIndex < visibleCategories.length - 1) {
      setQuizIndex((value) => value + 1);
      preserveScrollPosition();
      return;
    }
    setShowQuizComplete(true);
    setQuizIndex(visibleCategories.length - 1);
    preserveScrollPosition();
  }

  if (state.loading || loading) return <LoadingCard />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Awards" title="Community Awards" description="Vote for your friends. Votes stay private and can be changed anytime." group={state.group}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>Progress</Badge>
            <p className="mt-2 text-2xl font-black sm:text-3xl">{progress.voted + progress.white} / {progress.total} Awards Completed</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={viewMode === "classic" ? "primary" : "secondary"} onClick={() => { preserveScrollPosition(); setShowQuizComplete(false); setViewMode("classic"); }}>Classic</Button>
            <Button type="button" size="sm" variant={viewMode === "quiz" ? "primary" : "secondary"} onClick={() => { preserveScrollPosition(); setShowQuizComplete(false); setViewMode("quiz"); }}>Quiz flow</Button>
          </div>
        </div>
      </Card>

      {showQuizComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-2xl">
            <p className="text-4xl">🎉</p>
            <h3 className="mt-3 text-2xl font-black">Awards quiz complete</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your votes are now saved. You can still adjust them later if you want to change your mind.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowQuizComplete(false)}>Close</Button>
              <Button onClick={() => setShowQuizComplete(false)}>Continue</Button>
            </div>
          </motion.div>
        </div>
      )}

      {viewMode === "quiz" && quizAward ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <Badge>{quizAward.emoji} Round {quizIndex + 1} / {visibleCategories.length}</Badge>
            <h2 className="mt-3 text-2xl font-black">{quizAward.title}</h2>
            <p className="mt-2 text-muted-foreground">{quizAward.description}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {filterActiveGameMembers(state.members).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="flex items-center gap-3 rounded-3xl border border-border bg-background p-4 text-left transition hover:border-accent"
                  onClick={() => void submitQuizVote(member.userId || member.id)}
                >
                  <Avatar src={member.avatarUrl ?? ""} alt={memberName(member)} />
                  <p className="font-black">{memberName(member)}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void submitQuizVote(state.userId ?? null)}>Vote for myself</Button>
              <Button variant="secondary" onClick={() => void submitQuizVote(null, true)}>White vote</Button>
              {quizIndex > 0 && <Button variant="ghost" onClick={() => { preserveScrollPosition(); setQuizIndex((value) => value - 1); }}>Previous</Button>}
            </div>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="grid gap-2">
            {visibleCategories.map((category) => {
              const vote = votes.find((item) => item.awardId === category.id);
              const status = vote?.isWhiteVote ? "⚪ White vote" : vote?.targetUserId ? "🟢 Voted" : "🕒 Not voted";
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => { preserveScrollPosition(); setActiveAward(category.id); }}
                  className={`rounded-2xl border px-4 py-3 text-left ${activeAward === category.id ? "border-accent bg-accent/15" : "border-border bg-background"}`}
                >
                  <p className="font-black">{category.emoji} {category.title}</p>
                  <p className="text-xs text-muted-foreground">{status}</p>
                </button>
              );
            })}
          </Card>

          {award && (
            <motion.div key={award.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <Badge>{award.emoji} {award.title}</Badge>
                <p className="mt-3 text-muted-foreground">{award.description}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {filterActiveGameMembers(state.members).map((member) => (
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
      )}
    </PageShell>
  );
}
