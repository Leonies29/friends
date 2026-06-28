import type { ElementType } from "react";
import * as Icons from "lucide-react";
import { Badge } from "@/components/ui";
import { AnimatedAchievementCard } from "@/components/game/animated-achievement-card";
import { badges, currentUser } from "@/lib/mock-data";

export default function BadgesPage() {
  const unlockedIds = new Set(currentUser.badges.map((badge) => badge.id));

  return (
    <div className="grid gap-6">
      <div className="turkish-tile rounded-[2.5rem] bg-primary p-8 text-primary-foreground shadow-2xl">
        <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Animated Achievements</Badge>
        <h1 className="mt-3 font-display text-6xl font-black leading-none">Badge Vault</h1>
        <p className="mt-3 max-w-2xl text-primary-foreground/75">A premium collection screen for unlocked titles, secret discoveries, and endgame bragging rights.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => {
          const Icon = (Icons[badge.icon as keyof typeof Icons] ?? Icons.BadgeCheck) as ElementType;
          const unlocked = unlockedIds.has(badge.id);

          return (
            <div key={badge.id} className="relative">
              <AnimatedAchievementCard title={badge.name} description={badge.description} unlocked={unlocked} />
              <div className="pointer-events-none absolute left-5 top-5 grid h-14 w-14 place-items-center rounded-2xl bg-background/80 text-accent backdrop-blur">
                <Icon className="h-7 w-7" />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
