import { BadgeCheck, Camera, Crosshair, Sparkles, Star, Trophy } from "lucide-react";
import { Avatar, Badge, Card, GameCard, Progress } from "@/components/ui";
import { LevelMedallion } from "@/components/game/level-medallion";
import { RpgProgressPanel } from "@/components/game/rpg-progress-panel";
import { currentUser } from "@/lib/mock-data";
import { getLevelProgress } from "@/lib/utils";

const stats = [
  { label: "Challenges completed", value: currentUser.stats.challengesCompleted, icon: Sparkles },
  { label: "Assassinations", value: currentUser.stats.assassinations, icon: Crosshair },
  { label: "Photos uploaded", value: currentUser.stats.photosUploaded, icon: Camera },
  { label: "Points earned", value: currentUser.stats.pointsEarned, icon: Trophy }
];

export default function ProfilePage() {
  return (
    <div className="grid gap-6">
      <GameCard className="overflow-hidden p-0">
        <div className="turkish-tile relative h-48 bg-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="absolute bottom-6 right-6 hidden text-right text-primary-foreground md:block">
            <p className="text-xs font-black uppercase tracking-[0.35em] opacity-70">Hero Class</p>
            <p className="font-display text-4xl font-black">Grand Vizier</p>
          </div>
        </div>
        <div className="-mt-20 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-end gap-5">
              <Avatar src={currentUser.avatarUrl} alt={currentUser.username} className="h-36 w-36 border-4" />
              <div className="pb-2">
                <Badge>Joined {new Date(currentUser.joinedAt).toLocaleDateString("en")}</Badge>
                <h1 className="mt-3 font-display text-6xl font-black leading-none">{currentUser.username}</h1>
                <p className="mt-2 font-semibold text-muted-foreground">{currentUser.country} ? {currentUser.countryCode} / Level {currentUser.level} / {currentUser.totalXp.toLocaleString()} total XP</p>
              </div>
            </div>
            <LevelMedallion level={currentUser.level} xp={currentUser.totalXp} className="h-28 w-28" />
          </div>
          <div className="mt-7 rounded-[1.75rem] border border-border bg-white/45 p-4 dark:bg-white/5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-black">Next Level Progress</p>
              <Badge>{500 - (currentUser.totalXp % 500)} XP remaining</Badge>
            </div>
            <Progress value={getLevelProgress(currentUser.totalXp)} />
          </div>
        </div>
      </GameCard>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <GameCard key={stat.label}>
              <Icon className="h-7 w-7 text-accent" />
              <p className="mt-5 text-3xl font-black">{stat.value.toLocaleString()}</p>
              <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
            </GameCard>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <RpgProgressPanel />

        <Card>
          <Badge>Achievement Tracks</Badge>
          <div className="mt-5 grid gap-4">
            {currentUser.achievements.map((achievement) => (
              <div key={achievement.id} className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">{achievement.title}</h3>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <Progress value={(achievement.progress / achievement.goal) * 100} className="mt-4" />
                <p className="mt-2 text-xs font-black text-muted-foreground">
                  {achievement.progress}/{achievement.goal} / {achievement.xpReward} XP reward
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <Badge>Unlocked Badges</Badge>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {currentUser.badges.map((badge) => (
            <div key={badge.id} className="rounded-3xl border border-border bg-white/45 p-4 transition hover:-translate-y-1 dark:bg-white/5">
              <BadgeCheck className="h-7 w-7 text-accent" />
              <h3 className="mt-3 font-black">{badge.name}</h3>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
