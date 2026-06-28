import { Award, Compass, Star } from "lucide-react";
import { Badge, Card, Progress } from "@/components/ui";
import { currentUser, quest } from "@/lib/mock-data";
import { getLevelProgress } from "@/lib/utils";
import { LevelMedallion } from "./level-medallion";

export function RpgProgressPanel() {
  const collected = quest.relics.filter((relic) => relic.collectedAt).length;
  const questProgress = Math.round((collected / quest.relics.length) * 100);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
      <div className="flex items-center gap-4">
        <LevelMedallion level={currentUser.level} xp={currentUser.totalXp} />
        <div className="min-w-0 flex-1">
          <Badge>RPG Progression</Badge>
          <h3 className="mt-2 text-2xl font-black">Grand Bazaar Adventurer</h3>
          <p className="text-sm text-muted-foreground">{500 - (currentUser.totalXp % 500)} XP until Level {currentUser.level + 1}</p>
        </div>
      </div>
      <Progress value={getLevelProgress(currentUser.totalXp)} className="mt-5" />
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-white/45 p-3 dark:bg-white/5"><Star className="mx-auto h-5 w-5 text-accent" /><p className="mt-1 text-lg font-black">{currentUser.totalXp}</p><p className="text-[10px] font-bold uppercase text-muted-foreground">XP</p></div>
        <div className="rounded-2xl bg-white/45 p-3 dark:bg-white/5"><Compass className="mx-auto h-5 w-5 text-accent" /><p className="mt-1 text-lg font-black">{questProgress}%</p><p className="text-[10px] font-bold uppercase text-muted-foreground">Route</p></div>
        <div className="rounded-2xl bg-white/45 p-3 dark:bg-white/5"><Award className="mx-auto h-5 w-5 text-accent" /><p className="mt-1 text-lg font-black">{currentUser.badges.length}</p><p className="text-[10px] font-bold uppercase text-muted-foreground">Badges</p></div>
      </div>
    </Card>
  );
}
