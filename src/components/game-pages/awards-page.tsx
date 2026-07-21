"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge, Button, Card } from "@/components/ui";
import { filterActiveGameMembers, memberUserId } from "@/lib/game-members";
import { useActiveGroup } from "@/hooks/use-active-group";
import { canManageGames } from "@/services/permissions";
import { castVote, countUserVotes, ensureAwardCategories, getAwardCeremony, listAwardCategories } from "@/services/award-service";
import type { AwardCategory } from "@/types/game";
import { Avatar } from "@/components/ui";
import { AwardsCeremonyView } from "@/components/awards/awards-ceremony-view";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function memberName(member: { nickname?: string; username?: string }) {
  return member.nickname || member.username || "Player";
}

export function AwardsPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [progress, setProgress] = useState({ voted: 0, white: 0, total: 0 });
  const [tab, setTab] = useState<"vote" | "ceremony">("vote");
  const [quizIndex, setQuizIndex] = useState(0);
  const [showQuizComplete, setShowQuizComplete] = useState(false);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories]
  );

  // An admin can hide/show a category while a voter is mid-quiz, shrinking visibleCategories
  // under a quizIndex that was valid a moment ago. Without this, quizAward silently becomes
  // undefined and the quiz screen disappears (falls back to the classic view) mid-flow.
  useEffect(() => {
    setQuizIndex((current) => Math.min(current, Math.max(visibleCategories.length - 1, 0)));
  }, [visibleCategories.length]);

  function preserveScrollPosition() {
    if (typeof window === "undefined") return;
    const currentTop = window.scrollY;
    requestAnimationFrame(() => window.scrollTo({ top: currentTop, behavior: "auto" }));
  }

  const load = useCallback(async () => {
    if (!state.group?.id || !state.userId) return;
    setLoading(true);
    if (canManageGames(state.currentMember?.role)) {
      await ensureAwardCategories(state.group.id).catch(() => undefined);
    }
    const [allCategories, voteProgress] = await Promise.all([
      listAwardCategories(state.group.id),
      countUserVotes(state.userId, state.group.id)
    ]);
    setCategories(allCategories);
    setProgress(voteProgress);
    setLoading(false);
    preserveScrollPosition();
  }, [state.group?.id, state.userId, state.currentMember?.role]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!state.group?.id) return;
    void getAwardCeremony(state.group.id).then((ceremony) => {
      if (ceremony && ceremony.status !== "idle") setTab("ceremony");
    });
  }, [state.group?.id]);

  const quizAward = visibleCategories[quizIndex];

  async function submitVote(targetUserId: string | null, isWhiteVote = false, awardId: string) {
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

  const canManage = canManageGames(state.currentMember?.role);

  return (
    <PageShell eyebrow="Awards" title="Community Awards" description="Vote for your friends, then watch the results unfold at the ceremony." group={state.group}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>Progress</Badge>
            <p className="mt-2 text-2xl font-black sm:text-3xl">{progress.voted + progress.white} / {progress.total} Awards Completed</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={tab === "vote" ? "primary" : "secondary"} onClick={() => { preserveScrollPosition(); setTab("vote"); }}>Vote</Button>
            <Button type="button" size="sm" variant={tab === "ceremony" ? "primary" : "secondary"} onClick={() => { preserveScrollPosition(); setTab("ceremony"); }}>Ceremony</Button>
          </div>
        </div>
      </Card>

      {tab === "ceremony" ? (
        <AwardsCeremonyView groupId={state.group.id} members={state.members} canManage={canManage} />
      ) : (
        <>
          {showQuizComplete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-2xl">
                <p className="text-4xl">🎉</p>
                <h3 className="mt-3 text-2xl font-black">Awards complete</h3>
                <p className="mt-2 text-sm text-muted-foreground">Your votes are now saved. You can still adjust them later if you want to change your mind. Results stay hidden until the ceremony is launched.</p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowQuizComplete(false)}>Close</Button>
                  <Button onClick={() => setShowQuizComplete(false)}>Continue</Button>
                </div>
              </motion.div>
            </div>
          )}

          {quizAward ? (
            <motion.div key={quizAward.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
                      onClick={() => void submitQuizVote(memberUserId(member))}
                    >
                      <Avatar src={member.avatarUrl ?? ""} alt={memberName(member)} />
                      <p className="font-black">{memberName(member)}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void submitQuizVote(null, true)}>White vote</Button>
                  {quizIndex > 0 && <Button variant="ghost" onClick={() => { preserveScrollPosition(); setQuizIndex((value) => value - 1); }}>Previous</Button>}
                </div>
              </Card>
            </motion.div>
          ) : (
            <Card>
              <p className="text-sm text-muted-foreground">No award categories yet.</p>
            </Card>
          )}
        </>
      )}
    </PageShell>
  );
}
