import Link from "next/link";
import { ArrowRight, CalendarDays, Camera, Cat, Flame, Trophy, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, Progress } from "@/components/ui";
import { currentUser, photos, quest, scheduleEvents, users, worldEvents } from "@/lib/mock-data";
import { readinessPercent } from "@/lib/utils";

export default function DashboardPage() {
  const topPlayers = [...users].sort((a, b) => b.totalXp - a.totalXp).slice(0, 3);
  const relicProgress = Math.round((quest.relics.filter((relic) => relic.collectedAt).length / quest.relics.length) * 100);

  return (
    <div className="grid gap-6">
      <section className="turkish-tile relative overflow-hidden rounded-[2.5rem] bg-primary p-8 text-primary-foreground shadow-2xl md:p-12">
        <div className="relative z-10 max-w-3xl">
          <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Day 3 of 7 � Istanbul squad online</Badge>
          <h1 className="mt-5 font-display text-5xl font-black leading-none md:text-7xl">ISTANBUL QUEST</h1>
          <p className="mt-4 text-2xl font-bold text-primary-foreground/85 md:text-4xl">7 Days � 1 City � Countless Memories</p>
          <Button asChild size="lg" className="mt-8 bg-accent text-slate-950 hover:bg-amber-300">
            <Link href="/questline">
              Start Adventure
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <Cat className="absolute -right-8 bottom-4 h-44 w-44 rotate-12 text-white/10" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <Badge>Current World Event</Badge>
                <h2 className="mt-3 text-2xl font-black">{worldEvents[0].title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{worldEvents[0].description}</p>
              </div>
              <Flame className="h-12 w-12 text-accent" />
            </div>
          </Card>

          <Card>
            <Badge>Team Progress</Badge>
            <h2 className="mt-3 text-2xl font-black">Legend Badge Run</h2>
            <Progress value={relicProgress} className="mt-5" />
            <p className="mt-2 text-sm text-muted-foreground">{relicProgress}% of Istanbul relics collected</p>
          </Card>

          <Card className="md:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Badge>Today's Events</Badge>
                <h2 className="mt-2 text-2xl font-black">Ready Check</h2>
              </div>
              <CalendarDays className="h-8 w-8 text-accent" />
            </div>
            <div className="grid gap-3">
              {scheduleEvents.slice(0, 2).map((event) => (
                <Link key={event.id} href="/schedule" className="rounded-3xl border border-border bg-white/40 p-4 transition hover:-translate-y-1 hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{event.time} � {event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.meetingLocation}</p>
                    </div>
                    <Badge>{readinessPercent(event.readiness)}% ready</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <Badge>Leaderboard</Badge>
                <h2 className="mt-2 text-2xl font-black">Top 3</h2>
              </div>
              <Trophy className="h-8 w-8 text-accent" />
            </div>
            <div className="grid gap-3">
              {topPlayers.map((user, index) => (
                <div key={user.id} className="flex items-center gap-3 rounded-3xl bg-white/45 p-3 dark:bg-white/5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">#{index + 1}</span>
                  <Avatar src={user.avatarUrl} alt={user.username} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{user.username}</p>
                    <p className="text-xs text-muted-foreground">Level {user.level}</p>
                  </div>
                  <p className="font-black text-accent">{user.totalXp}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <Badge>Recent Photos</Badge>
              <Camera className="h-6 w-6 text-accent" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <img key={photo.id} src={photo.imageUrl} alt={photo.caption} className="aspect-square rounded-2xl object-cover" />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <Users className="h-9 w-9 text-accent" />
              <div>
                <p className="font-black">{users.length} players active</p>
                <p className="text-sm text-muted-foreground">{currentUser.username} is carrying the squad with style.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
