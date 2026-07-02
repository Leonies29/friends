"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { BINGO_CATEGORY_META, BINGO_DIFFICULTY_META } from "@/lib/bingo-constants";
import {
  createBingoChallenge,
  deleteBingoChallenge,
  ensureBingoChallenges,
  getBingoSession,
  launchBingoGame,
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
      const [items, session, pending] = await Promise.all([
        ensureBingoChallenges(groupId, game.id),
        getBingoSession(groupId, game.id),
        listPendingBingoSubmissions(groupId, game.id)
      ]);
      setChallenges(items);
      setSessionStatus(session?.status ?? "setup");
      setSubmissions(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [groupId, game.id]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createBingoChallenge(groupId, game.id, {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      category: String(form.get("category") ?? "custom") as BingoCategory,
      difficulty: String(form.get("difficulty") ?? "common") as BingoDifficulty
    });
    event.currentTarget.reset();
    setMessage("Défi ajouté.");
    await load();
  }

  async function handleLaunch() {
    setError("");
    try {
      await launchBingoGame({
        groupId,
        gameId: game.id,
        launchedBy: state.userId ?? "admin",
        players: state.members.map((member) => ({
          userId: member.userId || member.id,
          displayName: member.nickname || member.username || "Player"
        }))
      });
      setMessage("Partie lancée ! Chaque joueur a reçu sa grille.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lancement impossible.");
    }
  }

  async function handleReview(submission: BingoSubmission, status: "approved" | "rejected") {
    const adminComment = status === "rejected" ? window.prompt("Commentaire (optionnel)", "") ?? "" : "";
    await reviewBingoSubmission({
      submission,
      status,
      adminComment,
      reviewedBy: state.userId ?? "admin"
    });
    setMessage(status === "approved" ? "Preuve validée." : "Preuve refusée.");
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement du bingo...</p>;

  return (
    <div className="grid gap-4">
      {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {([
          ["challenges", "📋 Défis"],
          ["launch", "🚀 Lancer"],
          ["moderation", `✅ Modération (${submissions.length})`]
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
            <Badge>Ajouter un défi</Badge>
            <input name="title" required placeholder="Titre" className={inputClass} />
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
            <Button type="submit" size="sm">➕ Ajouter</Button>
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
                      {!challenge.active && <Badge>Inactif</Badge>}
                    </div>
                    <p className="mt-2 font-black">{challenge.title}</p>
                    <p className="text-sm text-muted-foreground">{challenge.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Modifier" onClick={() => {
                      const title = window.prompt("Titre", challenge.title);
                      const description = window.prompt("Description", challenge.description);
                      if (!title || !description) return;
                      void updateBingoChallenge(challenge.id, { title, description }).then(load);
                    }}>✏️</button>
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Activer/Désactiver" onClick={() => void updateBingoChallenge(challenge.id, { active: !challenge.active }).then(load)}>
                      {challenge.active ? "⏸️" : "▶️"}
                    </button>
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Supprimer" onClick={() => void deleteBingoChallenge(challenge.id).then(load)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "launch" && (
        <Card>
          <Badge>Lancer la partie</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Génère une grille 5×5 unique pour chaque joueur. Case centrale gratuite. Minimum 24 défis actifs.
          </p>
          <p className="mt-3 text-2xl font-black">{activeCount} défis actifs</p>
          <p className="text-sm font-semibold text-muted-foreground">Statut : {sessionStatus === "active" ? "🟢 Partie en cours" : "⚪ Prête à lancer"}</p>
          <Button className="mt-4" onClick={() => void handleLaunch()} disabled={activeCount < 24}>
            🚀 Générer les grilles
          </Button>
        </Card>
      )}

      {tab === "moderation" && (
        <div className="grid gap-3">
          {submissions.length === 0 && <Card><p className="text-sm text-muted-foreground">Aucune preuve en attente.</p></Card>}
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <Badge>{submission.userName} · case {submission.cellIndex + 1}</Badge>
              <p className="mt-2 font-black">{submission.challengeTitle}</p>
              {submission.proofText && (
                <p className="mt-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{submission.proofText}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => void handleReview(submission, "approved")}>✅ Accepter</Button>
                <Button size="sm" variant="secondary" onClick={() => void handleReview(submission, "rejected")}>❌ Refuser</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
