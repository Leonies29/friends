import type { ElementType } from "react";
import * as Icons from "lucide-react";
import { Badge, Card, Progress } from "@/components/ui";
import { quest, users } from "@/lib/mock-data";

export default function QuestlinePage() {
  const collected = quest.relics.filter((relic) => relic.collectedAt).length;

  return (
    <div className="grid gap-6">
      <Card className="turkish-tile bg-primary text-primary-foreground">
        <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Istanbul Questline</Badge>
        <h1 className="mt-3 font-display text-5xl font-black">{quest.name}</h1>
        <p className="mt-3 max-w-3xl text-primary-foreground/75">{quest.description}</p>
        <Progress value={(collected / quest.relics.length) * 100} className="mt-6 bg-white/15" />
        <p className="mt-3 font-bold">{collected}/{quest.relics.length} relics collected</p>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {quest.relics.map((relic) => {
          const Icon = (Icons[relic.icon as keyof typeof Icons] ?? Icons.Sparkles) as ElementType;
          const collector = users.find((user) => user.id === relic.collectedBy);
          return (
            <Card key={relic.id} className={relic.collectedAt ? "border-accent/40" : "opacity-75"}>
              <Icon className="h-9 w-9 text-accent" />
              <h2 className="mt-4 text-xl font-black">{relic.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{relic.xpReward} XP relic</p>
              <Badge className="mt-4">{relic.collectedAt ? `Collected by ${collector?.username}` : "Still hidden"}</Badge>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
