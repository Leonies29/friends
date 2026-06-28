import { Gamepad2, MapPin, Users } from "lucide-react";
import { Badge, GameCard } from "@/components/ui";
import { CreateGroupForm } from "@/components/create-group-form";

export default function CreateGroupPage() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <GameCard className="h-fit">
          <Badge>New Friend Space</Badge>
          <h1 className="mt-4 font-display text-5xl font-black leading-none">Create Your Own Quest</h1>
          <p className="mt-4 text-muted-foreground">
            Start from a blank space. Choose your friends, destination, dates, and the games you want to activate.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="flex gap-3 rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
              <Users className="h-6 w-6 shrink-0 text-accent" />
              <div>
                <p className="font-black">No predefined members</p>
                <p className="text-sm text-muted-foreground">You invite the people you want.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
              <MapPin className="h-6 w-6 shrink-0 text-accent" />
              <div>
                <p className="font-black">Any destination</p>
                <p className="text-sm text-muted-foreground">Istanbul, Tokyo, Lisbon, Cape Town, or anywhere else.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
              <Gamepad2 className="h-6 w-6 shrink-0 text-accent" />
              <div>
                <p className="font-black">Choose the game modes</p>
                <p className="text-sm text-muted-foreground">Keep it simple or turn the trip into a full RPG.</p>
              </div>
            </div>
          </div>
        </GameCard>

        <CreateGroupForm />
      </section>
    </main>
  );
}
