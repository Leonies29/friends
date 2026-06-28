import { PartyPopper, Trophy } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import { funAwards, users, worldEvents } from "@/lib/mock-data";

export default function AwardsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <section className="grid gap-4">
        <div>
          <Badge>End-of-Trip Awards</Badge>
          <h1 className="mt-3 font-display text-5xl font-black">Totally Official Ceremony</h1>
          <p className="mt-2 text-muted-foreground">Generated from stats like photos, XP, assassin wins, relics, and vibes that are legally non-binding.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {funAwards.map((award) => {
            const winner = users.find((user) => user.id === award.winnerId);
            return (
              <Card key={award.id} className="transition hover:-translate-y-2">
                <PartyPopper className="h-9 w-9 text-accent" />
                <h2 className="mt-4 text-2xl font-black">{award.title}</h2>
                {winner && (
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar src={winner.avatarUrl} alt={winner.username} />
                    <p className="font-black">{winner.username}</p>
                  </div>
                )}
                <p className="mt-4 text-sm text-muted-foreground">{award.reason}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="h-fit">
        <Badge>World Events</Badge>
        <h2 className="mt-3 text-3xl font-black">Daily Modifiers</h2>
        <div className="mt-5 grid gap-3">
          {worldEvents.map((event) => (
            <div key={event.id} className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
              <Trophy className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-black">{event.title}</h3>
              <p className="text-sm text-muted-foreground">{event.description}</p>
              <Badge className="mt-3">{event.effect}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
