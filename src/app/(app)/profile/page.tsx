import { BadgeCheck, Camera, Crosshair, Sparkles, Star, Trophy } from "lucide-react";
import { Avatar, Badge, Card, Progress } from "@/components/ui";
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
      <Card className="overflow-hidden p-0">
        <div className="turkish-tile h-36 bg-primary" />
        <div className="-mt-16 p-6 md:p-8">
          <Avatar src={currentUser.avatarUrl} alt={currentUser.username} className="h-32 w-32 border-4" />
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge>Joined {new Date(currentUser.joinedAt).toLocaleDateString("en")}</Badge>
              <h1 className="mt-3 font-display text-5xl font-black">{currentUser.username}</h1>
              <p className="text-muted-foreground">Level {currentUser.level} � {currentUser.totalXp.toLocaleString()} total XP</p>
            </div>
            <div className="min-w-64">
              <p className="mb-2 text-sm font-bold text-muted-foreground">{500 - (currentUser.totalXp % 500)} XP to next level</p>
              <Progress value={getLevelProgress(currentUser.totalXp)} />
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <Icon className="h-7 w-7 text-accent" />
              <p className="mt-5 text-3xl font-black">{stat.value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <Badge>Badges</Badge>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {currentUser.badges.map((badge) => (
              <div key={badge.id} className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
                <BadgeCheck className="h-7 w-7 text-accent" />
                <h3 className="mt-3 font-black">{badge.name}</h3>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Badge>Achievements</Badge>
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
                <p className="mt-2 text-xs font-bold text-muted-foreground">
                  {achievement.progress}/{achievement.goal} � {achievement.xpReward} XP reward
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
