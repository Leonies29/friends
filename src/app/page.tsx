import Link from "next/link";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, GameCard } from "@/components/ui";
import { friendGroups, users } from "@/lib/mock-data";

export default function Home() {
  const group = friendGroups[0];
  const members = users.filter((user) => group.memberIds.includes(user.id));

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="turkish-tile premium-border rounded-[2.75rem] bg-primary p-8 text-primary-foreground shadow-2xl md:p-12">
          <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Private friend group</Badge>
          <h1 className="mt-5 font-display text-6xl font-black leading-none md:text-8xl">ISTANBUL QUEST</h1>
          <p className="mt-5 max-w-2xl text-2xl font-black text-primary-foreground/85">Before entering the adventure, choose your travel squad.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="/register?group=istanbul-crew-2026">
                Join Istanbul Crew 2026
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="border-white/20 bg-white/10 text-primary-foreground hover:bg-white/20">
              <Link href="/create-group">
                Create New Group
                <Plus className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        <GameCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge>Selected Space</Badge>
              <h2 className="mt-3 text-4xl font-black">{group.name}</h2>
              <p className="mt-2 text-muted-foreground">{group.description}</p>
            </div>
            <Users className="h-10 w-10 text-accent" />
          </div>

          <div className="mt-6 grid gap-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-3xl border border-border bg-white/45 p-3 dark:bg-white/5">
                <Avatar src={member.avatarUrl} alt={member.username} />
                <div className="min-w-0 flex-1">
                  <p className="font-black">{member.username}</p>
                  <p className="text-sm font-semibold text-muted-foreground">{member.country} / {member.countryCode}</p>
                </div>
                <Badge>Lvl {member.level}</Badge>
              </div>
            ))}
          </div>

          <Card className="mt-6 bg-white/45 dark:bg-white/5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-accent">Invite Code</p>
            <p className="mt-2 text-3xl font-black">{group.inviteCode}</p>
            <p className="mt-2 text-sm text-muted-foreground">Use this when creating an account to enter the right friend space.</p>
          </Card>
        </GameCard>
      </section>
    </main>
  );
}
