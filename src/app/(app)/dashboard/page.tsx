import Link from "next/link";
import { ArrowRight, CalendarDays, Camera, Flame, Trophy, Users, Zap } from "lucide-react";
import { Avatar, Badge, Button, Card, GameCard, Progress } from "@/components/ui";
import { DailyRewardCard } from "@/components/game/daily-reward-card";
import { JourneyMap } from "@/components/game/journey-map";
import { RpgProgressPanel } from "@/components/game/rpg-progress-panel";
import { currentUser, photos, quest, scheduleEvents, users, worldEvents } from "@/lib/mock-data";
import { readinessPercent } from "@/lib/utils";

export default function DashboardPage() {
  const topPlayers = [...users].sort((a, b) => b.totalXp - a.totalXp).slice(0, 3);
  const relicProgress = Math.round((quest.relics.filter((relic) => relic.collectedAt).length / quest.relics.length) * 100);

  return (
    <div className="grid gap-6">
      <section className="turkish-tile premium-border relative overflow-hidden rounded-[2.75rem] bg-primary p-8 text-primary-foreground shadow-2xl md:p-12">
        <div className="absolute right-10 top-8 hidden rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black backdrop-blur md:block">
          Active Quest: Day 3
        </div>
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Premium adventure mode</Badge>
          <h1 className="mt-5 font-display text-6xl font-black leading-none md:text-8xl">ISTANBUL QUEST</h1>
          <p className="mt-4 text-2xl font-black text-primary-foreground/86 md:text-4xl">7 Days. 1 City. Countless Memories.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="gold">
              <Link href="/questline">
                Start Adventure
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="border-white/20 bg-white/10 text-primary-foreground hover:bg-white/20">
              <Link href="/challenges">
                Secret Challenge
                <Zap className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <JourneyMap />
          <div className="grid gap-6 md:grid-cols-2">
            <GameCard>
              <div className="flex items-center justify-between">
                <div>
                  <Badge>Current World Event</Badge>
                  <h2 className="mt-3 text-2xl font-black">{worldEvents[0].title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{worldEvents[0].description}</p>
                </div>
                <Flame className="h-12 w-12 text-accent" />
              </div>
            </GameCard>

            <GameCard>
              <Badge>Team Progress</Badge>
              <h2 className="mt-3 text-2xl font-black">Legend Badge Run</h2>
              <Progress value={relicProgress} className="mt-5" />
              <p className="mt-2 text-sm font-semibold text-muted-foreground">{relicProgress}% of Istanbul relics collected</p>
            </GameCard>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Badge>Today's Events</Badge>
                <h2 className="mt-2 text-2xl font-black">Ready Check Timeline</h2>
              </div>
              <CalendarDays className="h-8 w-8 text-accent" />
            </div>
            <div className="grid gap-3">
              {scheduleEvents.slice(0, 2).map((event) => (
                <Link key={event.id} href="/schedule" className="rounded-3xl border border-border bg-white/45 p-4 transition hover:-translate-y-1 hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{event.time} / {event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.meetingLocation}</p>
                    </div>
                    <Badge>{readinessPercent(event.readiness)}% ready</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 content-start">
          <div className="hidden xl:block">
            <DailyRewardCard />
          </div>
          <RpgProgressPanel />

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <Badge>Guild Rank</Badge>
                <h2 className="mt-2 text-2xl font-black">Top 3 Heroes</h2>
              </div>
              <Trophy className="h-8 w-8 text-accent" />
            </div>
            <div className="grid gap-3">
              {topPlayers.map((user, index) => (
                <div key={user.id} className="flex items-center gap-3 rounded-3xl bg-white/45 p-3 dark:bg-white/5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">#{index + 1}</span>
                  <Avatar src={user.avatarUrl} alt={user.username} />
                  <div className="min-w-0 flex-1">
                    <p className="font-black">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.country} ? {user.countryCode} / Level {user.level}</p>
                  </div>
                  <p className="font-black text-accent">{user.totalXp}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <Badge>Recent Memories</Badge>
              <Camera className="h-6 w-6 text-accent" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <img key={photo.id} src={photo.imageUrl} alt={photo.caption} className="aspect-square rounded-2xl object-cover shadow-lg transition hover:scale-105" />
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
