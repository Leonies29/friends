"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Cat,
  Crown,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  UserCircle,
  WandSparkles
} from "lucide-react";
import { useTheme } from "next-themes";
import { currentUser } from "@/lib/mock-data";
import { cn, getLevelProgress } from "@/lib/utils";
import { Avatar, Badge, Button, Progress } from "@/components/ui";
import { DailyRewardCard } from "@/components/game/daily-reward-card";
import { FloatingNotifications } from "@/components/game/floating-notifications";
import { LevelMedallion } from "@/components/game/level-medallion";
import { SoundToggle } from "@/components/game/sound-toggle";

const navItems = [
  { href: "/dashboard", label: "Quest Hub", icon: LayoutDashboard },
  { href: "/profile", label: "Hero", icon: UserCircle },
  { href: "/leaderboard", label: "Guild Rank", icon: Trophy },
  { href: "/schedule", label: "Planner", icon: CalendarDays },
  { href: "/photos", label: "Memories", icon: Camera },
  { href: "/challenges", label: "Secrets", icon: Sparkles },
  { href: "/assassin", label: "Assassin", icon: Shield },
  { href: "/questline", label: "Map", icon: Gamepad2 },
  { href: "/badges", label: "Relics", icon: BadgeCheck },
  { href: "/awards", label: "Awards", icon: Crown },
  { href: "/admin", label: "Admin", icon: WandSparkles }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [catsFound, setCatsFound] = useState(currentUser.stats.catsFound);
  const [xpPop, setXpPop] = useState(false);

  function logout() {
    document.cookie = "istanbul_quest_session=; path=/; max-age=0; SameSite=Lax";
    router.push("/login");
  }

  function collectCat() {
    setCatsFound((value) => Math.min(50, value + 1));
    setXpPop(true);
    window.setTimeout(() => setXpPop(false), 850);
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-0">
      <FloatingNotifications />

      <aside className="fixed left-4 top-4 z-40 hidden h-[calc(100vh-2rem)] w-80 flex-col rounded-[2.25rem] border border-border bg-background/58 p-4 shadow-2xl shadow-slate-950/15 backdrop-blur-2xl lg:flex">
        <Link href="/dashboard" className="turkish-tile premium-border relative overflow-hidden rounded-[1.75rem] bg-primary p-5 text-primary-foreground">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
          <p className="text-xs font-black uppercase tracking-[0.35em] text-primary-foreground/70">Adventure Pass</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-none">Istanbul Quest</h1>
          <p className="mt-2 text-sm font-semibold text-primary-foreground/78">7 Days. 1 City. Endless Memories.</p>
        </Link>

        <div className="mt-4 rounded-[1.75rem] border border-border bg-white/42 p-4 dark:bg-white/5">
          <div className="flex items-center gap-4">
            <LevelMedallion level={currentUser.level} xp={currentUser.totalXp} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <Badge>Hero Level</Badge>
              <p className="mt-2 truncate text-xl font-black">{currentUser.username}</p>
              <p className="text-xs font-semibold text-muted-foreground">{currentUser.country} ? {currentUser.countryCode}</p>
              <p className="text-xs font-semibold text-muted-foreground">{currentUser.totalXp.toLocaleString()} XP collected</p>
            </div>
          </div>
          <Progress value={getLevelProgress(currentUser.totalXp)} className="mt-4" />
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-muted-foreground transition duration-300",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-white/45 hover:text-foreground dark:hover:bg-white/8"
                )}
              >
                <span className={cn("grid h-9 w-9 place-items-center rounded-xl transition", active ? "bg-white/35" : "bg-muted/60 group-hover:bg-accent/15")}> 
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button className="group relative mt-4 rounded-[1.75rem] border border-dashed border-accent/50 bg-accent/10 p-4 text-left" onClick={collectCat}>
          {xpPop && <span className="absolute right-5 top-3 rounded-full bg-accent px-3 py-1 text-xs font-black text-slate-950">+15 XP</span>}
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/20 text-accent transition group-hover:rotate-12 group-hover:scale-110">
              <Cat className="h-5 w-5" />
            </span>
            <div>
              <p className="font-black">Hidden Cats</p>
              <p className="text-xs font-semibold text-muted-foreground">Premium easter egg hunt</p>
            </div>
          </div>
          <Progress value={(catsFound / 50) * 100} className="mt-3" />
          <p className="mt-2 text-xs font-black text-muted-foreground">Cats Found {catsFound}/50</p>
        </button>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/64 px-4 py-3 backdrop-blur-2xl lg:ml-[21rem] lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar src={currentUser.avatarUrl} alt={currentUser.username} />
            <div>
              <p className="font-black">{currentUser.username}</p>
              <p className="text-xs font-semibold text-muted-foreground">{currentUser.country} ? {currentUser.countryCode} / Level {currentUser.level}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:ml-[21rem] lg:px-8">
        <div className="mb-6 grid gap-4 xl:hidden">
          <DailyRewardCard />
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[2rem] border border-white/20 bg-background/76 p-2 shadow-2xl shadow-slate-950/25 backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative grid place-items-center gap-1 rounded-[1.25rem] px-2 py-2 text-[10px] font-black transition duration-300",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {active && <span className="absolute -top-1 h-1 w-8 rounded-full bg-white/80" />}
                <Icon className="h-5 w-5" />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
