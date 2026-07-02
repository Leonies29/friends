"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
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
import { signOut } from "firebase/auth";
import { useTheme } from "next-themes";
import { getFirebaseAuth } from "@/firebase/auth";
import { useActiveGroup } from "@/hooks/use-active-group";
import { canManageGames } from "@/services/permissions";
import { cn, calculateLevel, getLevelProgress } from "@/lib/utils";
import { Avatar, Badge, Button, Progress } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Home", emoji: "H", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", emoji: "P", icon: UserCircle },
  { href: "/leaderboard", label: "Ranking", emoji: "R", icon: Trophy },
  { href: "/schedule", label: "Planner", emoji: "P", icon: CalendarDays },
  { href: "/photos", label: "Photos", emoji: "P", icon: Camera },
  { href: "/challenges", label: "Challenges", emoji: "C", icon: Sparkles },
  { href: "/assassin", label: "Assassin", emoji: "A", icon: Shield },
  { href: "/questline", label: "Quests", emoji: "Q", icon: Gamepad2 },
  { href: "/badges", label: "Badges", emoji: "B", icon: BadgeCheck },
  { href: "/awards", label: "Awards", emoji: "W", icon: Crown },
  { href: "/admin", label: "Admin", emoji: "A", icon: WandSparkles, adminOnly: true }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const state = useActiveGroup();
  const [showMore, setShowMore] = useState(false);
  const canAdmin = canManageGames(state.currentMember?.role);
  const currentMember = state.members.find((member) => member.id === state.userId || member.userId === state.userId);
  const displayName = currentMember?.nickname || currentMember?.username || "Traveler";
  const totalXp = 0;
  const level = calculateLevel(totalXp);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || canAdmin);
  const mobileNavItems = visibleNavItems.filter((item) => ["/dashboard", "/schedule", "/photos", "/leaderboard"].includes(item.href));
  const overflowNavItems = visibleNavItems.filter((item) => !mobileNavItems.some((mobileItem) => mobileItem.href === item.href));

  async function logout() {
    await signOut(getFirebaseAuth()).catch(() => undefined);
    document.cookie = "istanbul_quest_session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "istanbul_quest_active_group=; path=/; max-age=0; SameSite=Lax";
    router.push("/");
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-0">
      <aside className="fixed left-4 top-4 z-40 hidden h-[calc(100vh-2rem)] w-80 flex-col rounded-[1.75rem] border border-border bg-background p-4 shadow-xl shadow-slate-950/10 lg:flex">
        <Link href="/dashboard" className="rounded-[1.5rem] bg-primary p-5 text-primary-foreground">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-primary-foreground/70">Adventure Pass</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-none">Istanbul Quest</h1>
          <p className="mt-2 text-sm font-semibold text-primary-foreground/78">{state.group?.name ?? "Private travel game"}</p>
        </Link>

        <div className="mt-4 rounded-[1.5rem] border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <Avatar src={currentMember?.avatarUrl ?? ""} alt={displayName} className="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <Badge>{state.currentMember?.role ?? "PLAYER"}</Badge>
              <p className="mt-2 truncate text-xl font-black">{displayName}</p>
              <p className="text-xs font-semibold text-muted-foreground">Level {level} / {totalXp.toLocaleString()} XP</p>
            </div>
          </div>
          <Progress value={getLevelProgress(totalXp)} className="mt-4" />
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-muted-foreground transition",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted hover:text-foreground"
                )}
              >
                <span className={cn("grid place-items-center rounded-xl font-black transition", active ? "h-10 w-10 bg-accent text-sm text-slate-950" : "h-9 w-9 bg-muted/60 text-xs")}>
                  {active ? item.emoji : <Icon className="h-4 w-4" />}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background px-4 py-3 lg:ml-[21rem] lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar src={currentMember?.avatarUrl ?? ""} alt={displayName} />
            <div>
              <p className="font-black">{displayName}</p>
              <p className="text-xs font-semibold text-muted-foreground">{state.group?.name ?? `Level ${level}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        {children}
      </main>

      {showMore && (
        <div className="fixed inset-x-3 bottom-24 z-50 rounded-[1.5rem] border border-border bg-background p-3 shadow-xl lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            {overflowNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-3 text-sm font-black" onClick={() => setShowMore(false)}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[1.5rem] border border-border bg-background p-2 shadow-xl shadow-slate-950/15 lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative grid place-items-center gap-1 rounded-[1.1rem] px-2 py-2 text-[10px] font-black transition",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <span className={cn(active ? "text-base" : "hidden")}>{item.emoji}</span>
                {!active && <Icon className="h-5 w-5" />}
                <span className={cn(active && "text-[11px]")}>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          {overflowNavItems.length > 0 && (
            <button type="button" className="grid place-items-center gap-1 rounded-[1.1rem] px-2 py-2 text-[10px] font-black text-muted-foreground" onClick={() => setShowMore((value) => !value)}>
              <Gamepad2 className="h-5 w-5" />
              More
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
