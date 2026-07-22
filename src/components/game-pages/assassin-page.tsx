"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, RefreshCw, Skull, Swords, Target } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { claimElimination, loadAssassinState, respondElimination } from "@/services/assassin-service";
import type { AssassinElimination, AssassinGame, AssassinMission, AssassinPlayer } from "@/types/game";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import { getAssassinProgression } from "@/lib/assassin-progression";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function findMember(members: ReturnType<typeof useActiveGroup>["members"], id?: string | null) {
  return members.find((member) => member.id === id || member.userId === id);
}

function eliminationStatusLabel(status: AssassinElimination["status"]) {
  switch (status) {
    case "pending": return "Pending";
    case "confirmed": return "Confirmed";
    case "contested": return "Contested — admin review";
    case "rejected": return "Rejected by admin";
    default: return status;
  }
}

export function AssassinPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<AssassinPlayer[]>([]);
  const [missions, setMissions] = useState<AssassinMission[]>([]);
  const [eliminations, setEliminations] = useState<AssassinElimination[]>([]);
  const [game, setGame] = useState<AssassinGame | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [missionExpanded, setMissionExpanded] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!state.group?.id) return;
    const silent = options?.silent ?? false;
    if (silent) setRefreshing(true);
    else setLoading(true);
    const data = await loadAssassinState(state.group.id);
    setGame(data.game);
    setPlayers(data.players);
    setMissions(data.missions);
    setEliminations(data.eliminations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    if (!silent) setMissionExpanded(false);
    if (silent) setRefreshing(false);
    else setLoading(false);
  }, [state.group?.id]);

  const refreshButton = (
    <Button type="button" variant="secondary" size="sm" disabled={refreshing} onClick={() => void load({ silent: true })}>
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );

  useEffect(() => {
    void load();
  }, [load, state.members.length]);

  const myPlayer = players.find((player) => player.uid === state.userId);
  const myMission = missions.find((mission) => mission.playerId === state.userId);
  const myTarget = findMember(state.members, myPlayer?.currentTargetId);
  const progression = getAssassinProgression(myPlayer?.xpEarned ?? 0);
  const leaderboardPlayers = [...players]
    .sort((a, b) => (b.assassinPoints ?? 0) - (a.assassinPoints ?? 0))
    .slice(0, 5);
  const survivors = players.filter((player) => player.isAlive);
  const eliminated = players.filter((player) => !player.isAlive);
  const pendingForMe = eliminations.filter((item) => item.victimId === state.userId && item.status === "pending");
  const contestedForMe = eliminations.filter((item) => item.victimId === state.userId && item.status === "contested");
  const pendingByMe = eliminations.filter((item) => item.killerId === state.userId && item.status === "pending");
  const isDuel = game?.phase === "duel" && game.status === "active";
  const winner = game?.winnerId
    ? players.find((player) => player.uid === game.winnerId)
    : survivors.length === 1 ? survivors[0] : null;

  async function markAccomplished() {
    if (!state.group?.id || !state.userId || !myPlayer?.currentTargetId || claiming) return;
    setError("");
    setClaiming(true);
    try {
      await claimElimination(state.group.id, state.userId, myPlayer.currentTargetId);
      setMissionExpanded(false);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to claim elimination.");
    } finally {
      setClaiming(false);
    }
  }

  async function respond(itemId: string, accept: boolean) {
    if (!state.userId) return;
    setError("");
    setRespondingId(itemId);
    try {
      await respondElimination(itemId, accept, state.userId);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to respond.");
    } finally {
      setRespondingId(null);
    }
  }

  if (state.loading || loading) return <LoadingCard />;
  if (!state.group) return <EmptyGroupCard />;
  if (state.currentMember?.status === "inactive") {
    return (
      <PageShell eyebrow="Assassin" title="Secret Elimination Game" description="You are inactive for this trip." group={state.group}>
        <Card>
          <Badge>Inactive player</Badge>
          <p className="mt-3 text-lg font-black">You are not playing active games right now.</p>
          <p className="mt-2 text-muted-foreground">Ask a trip admin to reactivate you in Admin → Players.</p>
        </Card>
      </PageShell>
    );
  }

  const playerChip = (player: AssassinPlayer, eliminated = false) => {
    const member = findMember(state.members, player.uid);
    const avatar = resolveMemberAvatar(state.group, member ?? { username: player.displayName, avatarUrl: player.avatarUrl });
    return (
      <div
        key={player.id}
        className={`flex items-center gap-1.5 rounded-xl bg-background px-2 py-1 ${eliminated ? "opacity-70" : ""}`}
      >
        {eliminated ? <Skull className="h-3.5 w-3.5 shrink-0" /> : null}
        <Avatar src={avatar} alt={player.displayName} className="h-7 w-7" />
        <span className="max-w-[4.5rem] truncate text-xs font-black">{player.displayName}</span>
      </div>
    );
  };

  const rosterSection = (
    <section className="grid grid-cols-2 gap-2 sm:gap-4">
      <Card className="p-3 sm:p-5">
        <Badge className="text-[10px]">Survivors</Badge>
        <div className="mt-2 flex min-h-[3rem] flex-wrap content-start gap-1.5">
          {survivors.length === 0 ? (
            <p className="text-xs text-muted-foreground">None</p>
          ) : (
            survivors.map((player) => playerChip(player))
          )}
        </div>
      </Card>
      <Card className="p-3 sm:p-5">
        <Badge className="text-[10px]">Eliminated</Badge>
        <div className="mt-2 flex min-h-[3rem] flex-wrap content-start gap-1.5">
          {eliminated.length === 0 ? (
            <p className="text-xs text-muted-foreground">None</p>
          ) : (
            eliminated.map((player) => playerChip(player, true))
          )}
        </div>
      </Card>
    </section>
  );

  if (game?.status === "finished") {
    return (
      <PageShell eyebrow="Assassin" title="Secret Elimination Game" description="The game is over." group={state.group} action={refreshButton}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="text-center">
            <Crosshair className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 text-4xl font-black">👑 SUPREME ASSASSIN</h2>
            <p className="mt-2 text-xl font-black">{winner?.displayName ?? "—"}</p>
          </Card>
        </motion.div>
      </PageShell>
    );
  }

  if (game?.status !== "active") {
    return (
      <PageShell eyebrow="Assassin" title="Secret Elimination Game" description="The game has not started yet." group={state.group} action={refreshButton}>
        <Card>
          <Badge>Waiting for admin</Badge>
          <p className="mt-3 text-lg font-black">The assassin game is not active yet.</p>
          <p className="mt-2 text-muted-foreground">An admin must configure targets and missions in Admin, then press Start Game.</p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Assassin" title="Secret Elimination Game" description="Only you can see your mission. Public page never reveals secret missions." group={state.group} action={refreshButton}>
      {isDuel && myPlayer?.isAlive && (
        <Card className="border-rose-300 bg-rose-50">
          <Badge>Final duel</Badge>
          <div className="mt-3 flex items-center gap-3">
            <Swords className="h-6 w-6 text-rose-700" />
            <p className="font-black text-rose-900">Only two players remain — you must eliminate each other.</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="border-rose-300 bg-rose-50">
          <p className="font-semibold text-rose-800">{error}</p>
        </Card>
      )}

      {rosterSection}

      {myPlayer && (
        <Card className="border-accent/30 bg-accent/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge>Player profile</Badge>
              <p className="mt-2 text-xl font-black">{myPlayer.displayName}</p>
              <p className="text-sm text-muted-foreground">{progression.title} · Level {progression.level}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Lives</p>
              <p className="text-2xl font-black">{myPlayer.lives}/{myPlayer.maxLives}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-3">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Assassin points</p>
              <p className="mt-1 text-xl font-black">{myPlayer.assassinPoints}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-3">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Missions completed</p>
              <p className="mt-1 text-xl font-black">{myPlayer.missionsCompleted}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-3">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Best streak</p>
              <p className="mt-1 text-xl font-black">{myPlayer.bestStreak}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <Badge>Leaderboard</Badge>
        <div className="mt-4 grid gap-3">
          {leaderboardPlayers.map((player, index) => {
            const member = findMember(state.members, player.uid);
            return (
              <div key={player.id} className="flex items-center justify-between rounded-2xl border border-border bg-background p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-muted-foreground">#{index + 1}</span>
                  <Avatar src={resolveMemberAvatar(state.group, member ?? { username: player.displayName, avatarUrl: player.avatarUrl })} alt={player.displayName} className="h-8 w-8" />
                  <div>
                    <p className="font-black">{player.displayName}</p>
                    <p className="text-xs text-muted-foreground">{player.assassinPoints ?? 0} points · {player.missionsCompleted ?? 0} missions</p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{player.eliminationCount ?? 0} eliminations</p>
                  <p>{player.bestStreak ?? 0} streak</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {myPlayer?.isAlive && myMission && pendingByMe.length === 0 && (
        missionExpanded ? (
          <Card>
            <div className="flex items-start justify-between gap-2">
              <Badge>{isDuel ? "Duel — your mission" : "Your mission"}</Badge>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMissionExpanded(false)}>
                Close
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Avatar
                src={resolveMemberAvatar(state.group, myTarget ?? {})}
                alt={myTarget?.nickname || myTarget?.username || "Target"}
                className="h-16 w-16"
              />
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Current target</p>
                <h2 className="text-2xl font-black">{myTarget?.nickname || myTarget?.username}</h2>
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-border bg-background p-4">
              <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Secret mission</p>
              <p className="mt-2 text-lg font-semibold">{myMission.missionText}</p>
            </div>
            <Button className="mt-4" disabled={claiming} onClick={() => void markAccomplished()}>
              <Target className="h-4 w-4" />
              {claiming ? "Claiming..." : "Mission accomplished"}
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">Players remaining: {survivors.length}</p>
          </Card>
        ) : (
          <button
            type="button"
            aria-label="Open your secret mission"
            onClick={() => setMissionExpanded(true)}
            className="flex h-[120px] w-[200px] max-w-full flex-col rounded-[1.25rem] border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary sm:rounded-[1.5rem]"
          >
            <Badge className="text-[10px]">{isDuel ? "Duel" : "Your mission"}</Badge>
            <div className="mt-1.5 flex min-w-0 items-center gap-2">
              <Avatar
                src={resolveMemberAvatar(state.group, myTarget ?? {})}
                alt={myTarget?.nickname || myTarget?.username || "Target"}
                className="h-8 w-8 shrink-0"
              />
              <p className="truncate text-sm font-black">{myTarget?.nickname || myTarget?.username}</p>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{myMission.missionText}</p>
            <p className="mt-auto pt-1 text-[10px] font-semibold text-accent">Tap to view</p>
          </button>
        )
      )}

      {!myPlayer?.isAlive && (
        <Card className="opacity-80">
          <Badge>Eliminated</Badge>
          <p className="mt-3 font-black">You have been eliminated. Watch the rest of the game.</p>
        </Card>
      )}

      {pendingByMe.map((item) => {
        const victim = findMember(state.members, item.victimId);
        return (
          <Card key={item.id} className="border-sky-300 bg-sky-50">
            <Badge>Pending confirmation</Badge>
            <p className="mt-3 font-black">You claimed the elimination of {victim?.nickname || victim?.username}.</p>
            <p className="mt-2 text-sm text-muted-foreground">The victim must accept or refuse. If they refuse, the admin will decide.</p>
          </Card>
        );
      })}

      {pendingForMe.map((item) => {
        const killer = findMember(state.members, item.killerId);
        return (
          <Card key={item.id} className="border-amber-300 bg-amber-50">
            <Badge>Confirmation requested</Badge>
            <p className="mt-3 font-black">{killer?.nickname || killer?.username} claims they eliminated you.</p>
            <p className="mt-2 text-sm text-muted-foreground">Do you accept this elimination? If you refuse, the admin will decide.</p>
            <div className="mt-4 flex gap-2">
              <Button type="button" disabled={respondingId === item.id} onClick={() => void respond(item.id, true)}>
                {respondingId === item.id ? "Saving..." : "Confirm"}
              </Button>
              <Button type="button" variant="secondary" disabled={respondingId === item.id} onClick={() => void respond(item.id, false)}>
                Contest
              </Button>
            </div>
          </Card>
        );
      })}

      {contestedForMe.map((item) => {
        const killer = findMember(state.members, item.killerId);
        return (
          <Card key={item.id} className="border-violet-300 bg-violet-50">
            <Badge>Awaiting admin</Badge>
            <p className="mt-3 font-black">You refused the elimination by {killer?.nickname || killer?.username}.</p>
            <p className="mt-2 text-sm text-muted-foreground">The admin will decide whether the elimination is valid.</p>
          </Card>
        );
      })}

      <Card>
        <Badge>Elimination history</Badge>
        <div className="mt-4 grid gap-3">
          {eliminations.length === 0 && <p className="text-sm text-muted-foreground">No eliminations yet.</p>}
          {eliminations.map((item, index) => {
            const killer = findMember(state.members, item.killerId);
            const victim = findMember(state.members, item.victimId);
            return (
              <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl border border-border bg-background p-4">
                <p className="font-black">🔪 {killer?.nickname || killer?.username} → {victim?.nickname || victim?.username}</p>
                <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString("en")} · {eliminationStatusLabel(item.status)}</p>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </PageShell>
  );
}
