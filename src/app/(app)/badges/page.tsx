import type { ElementType } from "react";
import * as Icons from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { badges, currentUser } from "@/lib/mock-data";

export default function BadgesPage() {
  const unlockedIds = new Set(currentUser.badges.map((badge) => badge.id));

  return (
    <div className="grid gap-6">
      <div>
        <Badge>Achievements</Badge>
        <h1 className="mt-3 font-display text-5xl font-black">Badge Vault</h1>
        <p className="mt-2 text-muted-foreground">Unlock animations are wired through the animated app shell and hover states; Firebase can later persist unlock timestamps.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => {
          const Icon = (Icons[badge.icon as keyof typeof Icons] ?? Icons.BadgeCheck) as ElementType;
          const unlocked = unlockedIds.has(badge.id);

          return (
            <Card key={badge.id} className={`transition hover:-translate-y-2 ${unlocked ? "border-accent/40" : "grayscale"}`}>
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-accent/15 text-accent">
                <Icon className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-2xl font-black">{badge.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{badge.description}</p>
              <Badge className="mt-5">{unlocked ? "Unlocked" : "Locked"}</Badge>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
