import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { JoinGroupCard } from "@/components/join-group-card";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <section className="mx-auto grid max-w-5xl gap-6">
        <div className="turkish-tile premium-border rounded-[2.75rem] bg-primary p-8 text-primary-foreground shadow-2xl md:p-12">
          <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Private travel quests</Badge>
          <h1 className="mt-5 font-display text-6xl font-black leading-none md:text-8xl">ISTANBUL QUEST</h1>
          <p className="mt-5 max-w-2xl text-2xl font-black text-primary-foreground/85">
            Create or join a private adventure space for any friend trip.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg" className="border-white/20 bg-white/10 text-primary-foreground hover:bg-white/20">
              <Link href="/create-group">
                Create New Group
                <Plus className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        <JoinGroupCard />
      </section>
    </main>
  );
}
