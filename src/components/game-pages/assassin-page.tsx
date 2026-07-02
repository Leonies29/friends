"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Skull, Target } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { claimElimination, loadAssassinState, respondElimination } from "@/services/assassin-service";
import type { AssassinElimination, AssassinMission, AssassinPlayer } from "@/types/game";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

function findMember(members: ReturnType<typeof useActiveGroup>["members"], id?: string | null) {
  return members.find((member) => member.id === id || member.userId === id);
}

export function AssassinPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<AssassinPlayer[]>([]);
  const [missions, setMissions] = useState<AssassinMission[]>([]);
  const [eliminations, setEliminations] = useState<AssassinElimination[]>([]);

  const [gameStatus, setGameStatus] = useState<"setup" | "active" | "finished" | null>(null);

  async function load() {
    if (!state.group?.id) return;
    setLoading(true);
    const data = await loadAssassinState(state.group.id);
    setGameStatus(data.game?.status ?? null);
    setPlayers(data.players);
    setMissions(data.missions);
    setEliminations(data.eliminations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [state.group?.id, state.members.length]);

  const myPlayer = players.find((player) => player.uid === state.userId);
  const myMission = missions.find((mission) => mission.playerId === state.userId);
  const myTarget = findMember(state.members, myPlayer?.currentTargetId);
  const survivors = players.filter((player) => player.isAlive);
  const eliminated = players.filter((player) => !player.isAlive);
  const pendingForMe = eliminations.filter((item) => item.victimId === state.userId && item.status === "pending");

  async function markAccomplished() {
    if (!state.group?.id || !state.userId || !myPlayer?.currentTargetId) return;
    await claimElimination(state.group.id, state.userId, myPlayer.currentTargetId);
    await load();
  }

  if (state.loading || loading) return <LoadingCard />;
  if (!state.group) return <EmptyGroupCard />;

  if (gameStatus !== "active") {
    return (
      <PageShell eyebrow="Assassin" title="Secret Elimination Game" description="The game has not started yet." group={state.group}>
        <Card>
          <Badge>Waiting for admin</Badge>
          <p className="mt-3 text-lg font-black">The assassin game is not active yet.</p>
          <p className="mt-2 text-muted-foreground">An admin must configure targets and missions in Admin, then press Start Game.</p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Assassin" title="Secret Elimination Game" description="Only you can see your mission. Public page never reveals secret missions." group={state.group}>
      {myPlayer?.isAlive && myMission && (
        <Card>
          <Badge>Your mission</Badge>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Avatar src={resolveMemberAvatar(state.group, myTarget ?? {})} alt={myTarget?.nickname || myTarget?.username || "Target"} className="h-16 w-16" />
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Current target</p>
              <h2 className="text-2xl font-black">{myTarget?.nickname || myTarget?.username}</h2>
            </div>
          </div>
          <div className="mt-5 rounded-3xl border border-border bg-background p-4">
            <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Secret mission</p>
            <p className="mt-2 text-lg font-semibold">{myMission.missionText}</p>
          </div>
          <Button className="mt-4" onClick={() => void markAccomplished()}><Target className="h-4 w-4" />Mission accomplished</Button>
          <p className="mt-2 text-sm text-muted-foreground">Players remaining: {survivors.length}</p>
        </Card>
      )}

      {pendingForMe.map((item) => (
        <Card key={item.id} className="border-amber-300 bg-amber-50">
          <Badge>Pending confirmation</Badge>
          <p className="mt-3 font-black">Someone claims they eliminated you.</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void respondElimination(item.id, true)}>Confirm</Button>
            <Button variant="secondary" onClick={() => void respondElimination(item.id, false)}>Contest</Button>
          </div>
        </Card>
      ))}

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <Badge>Survivors</Badge>
          <div className="mt-4 grid gap-3">
            {survivors.map((player) => {
              const member = findMember(state.members, player.uid);
              const avatar = resolveMemberAvatar(state.group, member ?? { username: player.displayName, avatarUrl: player.avatarUrl });
              return (
              <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-background p-3">
                <Avatar src={avatar} alt={player.displayName} />
                <p className="font-black">{player.displayName}</p>
              </div>
            );})}
          </div>
        </Card>
        <Card>
          <Badge>Eliminated</Badge>
          <div className="mt-4 grid gap-3">
            {eliminated.map((player) => {
              const member = findMember(state.members, player.uid);
              const avatar = resolveMemberAvatar(state.group, member ?? { username: player.displayName, avatarUrl: player.avatarUrl });
              return (
              <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-background p-3 opacity-70">
                <Skull className="h-5 w-5" />
                <Avatar src={avatar} alt={player.displayName} />
                <p className="font-black">{player.displayName}</p>
              </div>
            );})}
          </div>
        </Card>
      </section>

      <Card>
        <Badge>Elimination history</Badge>
        <div className="mt-4 grid gap-3">
          {eliminations.length === 0 && <p className="text-sm text-muted-foreground">No eliminations yet.</p>}
          {eliminations.map((item, index) => {
            const killer = findMember(state.members, item.killerId);
            const victim = findMember(state.members, item.victimId);
            return (
              <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl border border-border bg-background p-4">
                <p className="font-black">🔪 {killer?.nickname || killer?.username} eliminated {victim?.nickname || victim?.username}</p>
                <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.status}</p>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {survivors.length === 1 && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="text-center">
            <Crosshair className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 text-4xl font-black">👑 SUPREME ASSASSIN</h2>
            <p className="mt-2 text-xl font-black">{survivors[0]?.displayName}</p>
          </Card>
        </motion.div>
      )}
    </PageShell>
  );
}
