import { CalendarPlus, CheckCircle2, Database, Flame, Shield, Sparkles, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, TextArea } from "@/components/ui";
import { challenges, photos, scheduleEvents, users } from "@/lib/mock-data";

const adminStats = [
  { label: "Users", value: users.length, icon: Users },
  { label: "Challenges", value: challenges.length, icon: Sparkles },
  { label: "Events", value: scheduleEvents.length, icon: CalendarPlus },
  { label: "Photos", value: photos.length, icon: Database }
];

export default function AdminPage() {
  return (
    <div className="grid gap-6">
      <div>
        <Badge>Admin Panel</Badge>
        <h1 className="mt-3 font-display text-5xl font-black">Trip Control Room</h1>
        <p className="mt-2 text-muted-foreground">Manage users, daily challenges, Assassin mode, schedule events, world events, and approvals.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {adminStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <Icon className="h-7 w-7 text-accent" />
              <p className="mt-5 text-3xl font-black">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <Badge>Create Challenge</Badge>
          <form className="mt-5 grid gap-4">
            <Field label="Title" placeholder="Convince a cat to approve you" />
            <TextArea label="Description" placeholder="Challenge instructions" />
            <Field label="Difficulty" placeholder="Easy, Medium, or Hard" />
            <Field label="XP reward" type="number" placeholder="150" />
            <Button type="button"><Sparkles className="h-4 w-4" />Create</Button>
          </form>
        </Card>

        <Card>
          <Badge>Assassin Controls</Badge>
          <form className="mt-5 grid gap-4">
            <Field label="Player" placeholder="Maya" />
            <Field label="Target" placeholder="Leo" />
            <Field label="Condition" placeholder="Get target to take a selfie with you" />
            <Button type="button"><Shield className="h-4 w-4" />Assign Mission</Button>
          </form>
        </Card>

        <Card>
          <Badge>World Event</Badge>
          <form className="mt-5 grid gap-4">
            <Field label="Name" placeholder="Golden Bazaar" />
            <TextArea label="Effect" placeholder="All bazaar relics grant bonus XP." />
            <Field label="Active date" type="date" />
            <Button type="button"><Flame className="h-4 w-4" />Activate</Button>
          </form>
        </Card>
      </section>

      <Card>
        <Badge>Manage Users</Badge>
        <div className="mt-5 grid gap-3">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/45 p-4 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <Avatar src={user.avatarUrl} alt={user.username} />
                <div>
                  <p className="font-black">{user.username}</p>
                  <p className="text-xs text-muted-foreground">Level {user.level} � {user.totalXp.toLocaleString()} XP</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm"><CheckCircle2 className="h-4 w-4" />Approve Proof</Button>
                <Button variant="ghost" size="sm">Manage</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
