"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/firebase/auth";
import { Badge, Button, Card } from "@/components/ui";
import { filterActiveGameMembers, memberUserId } from "@/lib/game-members";
import { formatFirestoreError } from "@/lib/firebase-errors";
import { useActiveGroup } from "@/hooks/use-active-group";
import { BINGO_CATEGORY_META, BINGO_DIFFICULTY_META } from "@/lib/bingo-constants";
import {
  createBingoChallenge,
  deleteBingoChallenge,
  ensureBingoChallenges,
  getBingoSession,
  launchBingoGame,
  listBingoChallenges,
  listPendingBingoSubmissions,
  reviewBingoSubmission,
  updateBingoChallenge
} from "@/services/bingo-service";
import type { Game } from "@/types";
import type { BingoCategory, BingoChallenge, BingoDifficulty, BingoSubmission } from "@/types/bingo";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function BingoSetupPanel({ game, groupId }: { game: Game; groupId: string }) {
  const state = useActiveGroup();
  const [challenges, setChallenges] = useState<BingoChallenge[]>([]);
  const [submissions, setSubmissions] = useState<BingoSubmission[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>("setup");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"challenges" | "launch" | "moderation">("challenges");

  const activeCount = useMemo(() => challenges.filter((challenge) => challenge.active).length, [challenges]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (state.userId) {
        await ensureAdminAccess().catch(() => undefined);
      }

      const [items, session] = await Promise.all([
        listBingoChallenges(groupId, game.id).then(async (loaded) => {
          if (loaded.length) return loaded;
          return ensureBingoChallenges(groupId, game.id, { seedIfEmpty: true });
        }),
        getBingoSession(groupId, game.id)
      ]);
      setChallenges(items);
      setSessionStatus(session?.status ?? "setup");

      try {
        setSubmissions(await listPendingBingoSubmissions(groupId, game.id));
      } catch {
        setSubmissions([]);
      }
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to load bingo."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [groupId, game.id]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await ensureAdminAccess();
      const form = new FormData(event.currentTarget);
      await createBingoChallenge(groupId, game.id, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        category: String(form.get("category") ?? "custom") as BingoCategory,
        difficulty: String(form.get("difficulty") ?? "common") as BingoDifficulty
      });
      event.currentTarget.reset();
      setMessage("Challenge added.");
      await load();
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to add this challenge."));
    }
  }

  async function handleUpdateChallenge(challengeId: string, data: Parameters<typeof updateBingoChallenge>[1]) {
    setError("");
    try {
      await ensureAdminAccess();
      await updateBingoChallenge(challengeId, data);
      await load();
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to update this challenge."));
    }
  }

  async function handleDeleteChallenge(challengeId: string) {
    setError("");
    try {
      await ensureAdminAccess();
      await deleteBingoChallenge(challengeId);
      await load();
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to delete this challenge."));
    }
  }

  async function ensureAdminAccess() {
    if (!state.userId) throw new Error("You must be signed in.");
    const { prepareGroupAdminAccess } = await import("@/services/group-service");
    await prepareGroupAdminAccess(groupId, state.userId, {
      appRole: state.currentMember?.role,
      email: getFirebaseAuth().currentUser?.email ?? state.currentMember?.email,
      nickname: state.currentMember?.nickname
    });
  }

  async function handleLaunch() {
    setError("");
    try {
      await ensureAdminAccess();
      await launchBingoGame({
        groupId,
        gameId: game.id,
        launchedBy: state.userId ?? "admin",
        players: filterActiveGameMembers(state.members).map((member) => ({
          userId: memberUserId(member),
          displayName: member.nickname || member.username || "Player"
        }))
      });
      setMessage("Game launched! Each player received their grid.");
      await load();
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to launch the game."));
    }
  }

  async function handleReview(submission: BingoSubmission, status: "approved" | "rejected") {
    setError("");
    try {
      await ensureAdminAccess();
      const adminComment = status === "rejected" ? window.prompt("Comment (optional)", "") ?? "" : "";
      await reviewBingoSubmission({
        submission,
        status,
        adminComment,
        reviewedBy: state.userId ?? "admin"
      });
      setMessage(status === "approved" ? "Proof approved." : "Proof rejected.");
      await load();
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to review this proof."));
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading bingo...</p>;

  return (
    <div className="grid gap-4">
      {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {([
          ["challenges", "📋 Challenges"],
          ["launch", "🚀 Launch"],
          ["moderation", `✅ Moderation (${submissions.length})`]
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-2xl px-4 py-2 text-sm font-black ${tab === id ? "bg-primary text-primary-foreground" : "border border-border bg-background"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "challenges" && (
        <>
          <form className="grid gap-2 rounded-2xl border border-border bg-background p-4" onSubmit={(event) => void handleAdd(event)}>
            <Badge>Add a challenge</Badge>
            <input name="title" required placeholder="Title" className={inputClass} />
            <textarea name="description" required placeholder="Description" className={`${inputClass} min-h-20`} />
            <div className="grid gap-2 md:grid-cols-2">
              <select name="category" className={inputClass}>
                {Object.entries(BINGO_CATEGORY_META).map(([key, value]) => (
                  <option key={key} value={key}>{value.emoji} {value.label}</option>
                ))}
              </select>
              <select name="difficulty" className={inputClass}>
                {Object.entries(BINGO_DIFFICULTY_META).map(([key, value]) => (
                  <option key={key} value={key}>{value.emoji} {value.label} · {key === "common" ? 1 : key === "rare" ? 3 : 5} pt</option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">➕ Add</Button>
          </form>

          <div className="grid gap-2">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="rounded-2xl border border-border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={BINGO_DIFFICULTY_META[challenge.difficulty].color}>
                        {BINGO_DIFFICULTY_META[challenge.difficulty].emoji} {challenge.points} pt
                      </Badge>
                      <Badge>{BINGO_CATEGORY_META[challenge.category].emoji} {BINGO_CATEGORY_META[challenge.category].label}</Badge>
                      {!challenge.active && <Badge>Inactive</Badge>}
                    </div>
                    <p className="mt-2 font-black">{challenge.title}</p>
                    <p className="text-sm text-muted-foreground">{challenge.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Edit" onClick={() => {
                      const title = window.prompt("Title", challenge.title);
                      const description = window.prompt("Description", challenge.description);
                      if (!title || !description) return;
                      void handleUpdateChallenge(challenge.id, { title, description });
                    }}>✏️</button>
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Enable/Disable" onClick={() => void handleUpdateChallenge(challenge.id, { active: !challenge.active })}>
                      {challenge.active ? "⏸️" : "▶️"}
                    </button>
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Delete" onClick={() => void handleDeleteChallenge(challenge.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "launch" && (
        <Card>
          <Badge>Launch game</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate a unique 5×5 grid for each player. Free center cell. Minimum 24 active challenges.
          </p>
          <p className="mt-3 text-2xl font-black">{activeCount} active challenges</p>
          <p className="text-sm font-semibold text-muted-foreground">Status: {sessionStatus === "active" ? "🟢 Game in progress" : "⚪ Ready to launch"}</p>
          <Button className="mt-4" onClick={() => void handleLaunch()} disabled={activeCount < 24}>
            🚀 Generate grids
          </Button>
        </Card>
      )}

      {tab === "moderation" && (
        <div className="grid gap-3">
          {submissions.length === 0 && <Card><p className="text-sm text-muted-foreground">No proofs pending review.</p></Card>}
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <Badge>{submission.userName} · cell {submission.cellIndex + 1}</Badge>
              <p className="mt-2 font-black">{submission.challengeTitle}</p>
              {submission.proofText && (
                <p className="mt-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{submission.proofText}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => void handleReview(submission, "approved")}>✅ Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => void handleReview(submission, "rejected")}>❌ Reject</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
