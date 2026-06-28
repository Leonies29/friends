import { Camera, Crown, Laugh, Map, Swords } from "lucide-react";
import { Avatar, Badge, Card, GameCard } from "@/components/ui";
import { users } from "@/lib/mock-data";

const rankings = [
  { title: "Funniest Player", winner: "Maya", icon: Laugh, note: "Weaponized timing and suspiciously good impressions." },
  { title: "Best Photographer", winner: "Nora", icon: Camera, note: "Can make a napkin look cinematic." },
  { title: "Master Explorer", winner: "Sam", icon: Map, note: "Lost twice, discovered three better routes." },
  { title: "Assassin King", winner: "Leo", icon: Swords, note: "Nobody trusts him near a selfie anymore." }
];

export default function LeaderboardPage() {
  const sortedUsers = [...users].sort((a, b) => b.totalXp - a.totalXp);
  const podium = sortedUsers.slice(0, 3);

  return (
    <div className="grid gap-6">
      <div className="turkish-tile rounded-[2.5rem] bg-primary p-8 text-primary-foreground shadow-2xl">
        <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Guild Leaderboard</Badge>
        <h1 className="mt-3 font-display text-6xl font-black leading-none">Hall of Glory</h1>
        <p className="mt-3 text-primary-foreground/75">Animated podiums, heroic ranks, and extremely serious vacation prestige.</p>
      </div>

      <section className="grid items-end gap-4 md:grid-cols-3">
        {[podium[1], podium[0], podium[2]].map((user, index) => {
          const actualRank = sortedUsers.findIndex((item) => item.id === user.id) + 1;
          const heights = ["md:min-h-60", "md:min-h-80", "md:min-h-52"];

          return (
            <GameCard key={user.id} className={`grid place-items-center text-center ${heights[index]}`}>
              <Crown className="mb-3 h-9 w-9 text-accent" />
              <Avatar src={user.avatarUrl} alt={user.username} className="h-24 w-24" />
              <h2 className="mt-4 text-2xl font-black">#{actualRank} {user.username}</h2>
              <p className="text-muted-foreground">{user.country} ? {user.countryCode} / Level {user.level}</p>
              <p className="mt-2 bg-gradient-to-r from-amber-300 to-yellow-600 bg-clip-text text-4xl font-black text-transparent">{user.totalXp.toLocaleString()} XP</p>
            </GameCard>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <Badge>Full Rankings</Badge>
          <div className="mt-5 grid gap-3">
            {sortedUsers.map((user, index) => (
              <div key={user.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-3xl bg-white/45 p-4 dark:bg-white/5">
                <span className="text-2xl font-black text-accent">#{index + 1}</span>
                <div className="flex items-center gap-3">
                  <Avatar src={user.avatarUrl} alt={user.username} />
                  <div>
                    <p className="font-black">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.country} ? {user.countryCode} / Level {user.level}</p>
                  </div>
                </div>
                <p className="hidden font-bold text-muted-foreground sm:block">{user.stats.challengesCompleted} quests</p>
                <p className="font-black">{user.totalXp.toLocaleString()} XP</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Badge>Fun Titles</Badge>
          <div className="mt-5 grid gap-3">
            {rankings.map((ranking) => {
              const Icon = ranking.icon;
              return (
                <div key={ranking.title} className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
                  <Icon className="h-7 w-7 text-accent" />
                  <h3 className="mt-3 font-black">{ranking.title}: {ranking.winner}</h3>
                  <p className="text-sm text-muted-foreground">{ranking.note}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
