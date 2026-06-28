import { Crosshair, History, ShieldAlert, Skull, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, Field } from "@/components/ui";
import { assassinMissions, currentUser, eliminationHistory, users } from "@/lib/mock-data";

export default function AssassinPage() {
  const myMission = assassinMissions.find((mission) => mission.playerId === currentUser.id);
  const target = users.find((user) => user.id === myMission?.targetId);
  const remainingPlayers = users.filter((user) => assassinMissions.some((mission) => mission.playerId === user.id && mission.status === "active"));

  return (
    <div className="grid gap-6">
      <Card className="turkish-tile bg-primary text-primary-foreground">
        <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Assassin Mode</Badge>
        <h1 className="mt-3 font-display text-5xl font-black">Trust Nobody. Especially Your Friends.</h1>
        <p className="mt-3 max-w-3xl text-primary-foreground/75">Each player has one secret target and one hidden elimination condition. When someone is eliminated, the winner inherits their assignment and earns XP.</p>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge>Private Target</Badge>
              <h2 className="mt-3 text-3xl font-black">{target?.username ?? "No target"}</h2>
              <p className="mt-2 text-muted-foreground">{myMission?.condition}</p>
            </div>
            <Crosshair className="h-12 w-12 text-accent" />
          </div>
          {target && <Avatar src={target.avatarUrl} alt={target.username} className="mt-6 h-28 w-28" />}
          <Button className="mt-6">
            <Skull className="h-4 w-4" />
            Report Elimination
          </Button>
        </Card>

        <Card>
          <Badge>Remaining Players</Badge>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {remainingPlayers.map((player) => (
              <div key={player.id} className="flex items-center gap-3 rounded-3xl bg-white/45 p-3 dark:bg-white/5">
                <Avatar src={player.avatarUrl} alt={player.username} />
                <div>
                  <p className="font-black">{player.username}</p>
                  <p className="text-xs text-muted-foreground">Still suspicious</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <Badge>Elimination History</Badge>
          <div className="mt-5 grid gap-3">
            {eliminationHistory.map((record) => {
              const assassin = users.find((user) => user.id === record.assassinId);
              const eliminated = users.find((user) => user.id === record.targetId);
              return (
                <div key={record.id} className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
                  <History className="h-6 w-6 text-accent" />
                  <p className="mt-3 font-black">{assassin?.username} eliminated {eliminated?.username}</p>
                  <p className="text-sm text-muted-foreground">{record.condition}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <Badge>Admin Controls</Badge>
          <h2 className="mt-3 text-3xl font-black">Manage the Game</h2>
          <div className="mt-5 grid gap-4">
            <Field label="Assign player" placeholder="Maya" />
            <Field label="Secret target" placeholder="Leo" />
            <Field label="Elimination condition" placeholder="Make target hold your phone" />
            <div className="flex flex-wrap gap-2">
              <Button><Users className="h-4 w-4" />Assign</Button>
              <Button variant="secondary"><ShieldAlert className="h-4 w-4" />Reset Round</Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
