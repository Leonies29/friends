import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { JoinGroupCard } from "@/components/join-group-card";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-6">
      <section className="mx-auto grid max-w-5xl gap-5">
        <div className="turkish-tile premium-border rounded-[2.75rem] bg-primary p-6 text-primary-foreground shadow-2xl sm:p-8 md:p-10">
          <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Private travel quests</Badge>
          <h1 className="mt-4 font-display text-5xl font-black leading-none md:text-7xl">ISTANBUL QUEST</h1>
          <p className="mt-4 max-w-2xl text-xl font-black text-primary-foreground/85 md:text-2xl">
            Create or join a private adventure space for any friend trip.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg" className="border-white/20 bg-white/10 text-primary-foreground hover:bg-white/20">
              <Link href="/create-group">
                Create New Group
                <Plus className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="border-white/20 text-white/90 hover:bg-white/10">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>

        <Suspense fallback={<Card>Loading invite form...</Card>}>
          <JoinGroupCard />
        </Suspense>
      </section>
    </main>
  );
}
