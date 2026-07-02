"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Moon, MoreHorizontal, Sun } from "lucide-react";
import { signOut } from "firebase/auth";
import { useTheme } from "next-themes";
import { getFirebaseAuth } from "@/firebase/auth";
import { useActiveGroup } from "@/hooks/use-active-group";
import { canManageGames } from "@/services/permissions";
import { listXpTransactions } from "@/services/xp-service";
import { cn, calculateLevel, getLevelProgress } from "@/lib/utils";
import { Avatar, Badge, Button, Progress } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Home", emoji: "🏠" },
  { href: "/leaderboard", label: "Ranking", emoji: "🏆" },
  { href: "/schedule", label: "Planner", emoji: "📅" },
  { href: "/questline", label: "Quests", emoji: "🗺️" },
  { href: "/awards", label: "Awards", emoji: "🏅" },
  { href: "/assassin", label: "Assassin", emoji: "🔪" },
  { href: "/photos", label: "Travel Album", emoji: "📸" },
  { href: "/admin", label: "Admin", emoji: "⚙️", adminOnly: true }
];

const mobilePrimary = ["/dashboard", "/questline", "/assassin", "/photos", "/leaderboard"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const state = useActiveGroup();
  const [showMore, setShowMore] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const canAdmin = canManageGames(state.currentMember?.role);
  const currentMember = state.members.find((member) => member.id === state.userId || member.userId === state.userId);
  const displayName = currentMember?.nickname || currentMember?.username || "Traveler";
  const level = calculateLevel(totalXp);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || canAdmin);
  const mobileNavItems = visibleNavItems.filter((item) => mobilePrimary.includes(item.href));
  const overflowNavItems = visibleNavItems.filter((item) => !mobilePrimary.includes(item.href));

  useEffect(() => {
    if (!state.group?.id || !state.userId) return;
    void listXpTransactions(state.group.id).then((transactions) => {
      const xp = transactions.filter((item) => item.userId === state.userId).reduce((sum, item) => sum + item.amount, 0);
      setTotalXp(xp);
    });
  }, [state.group?.id, state.userId]);

  async function logout() {
    await signOut(getFirebaseAuth()).catch(() => undefined);
    document.cookie = "istanbul_quest_session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "istanbul_quest_active_group=; path=/; max-age=0; SameSite=Lax";
    router.push("/");
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-0">
      <aside className="fixed left-4 top-4 z-40 hidden h-[calc(100vh-2rem)] w-80 flex-col rounded-[1.75rem] border border-border bg-[#f6ead8] p-4 shadow-xl shadow-slate-950/10 lg:flex">
        <Link href="/dashboard" className="rounded-[1.5rem] bg-primary p-5 text-primary-foreground">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-primary-foreground/70">Adventure Pass</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-none">Istanbul Quest</h1>
          <p className="mt-2 text-sm font-semibold text-primary-foreground/78">{state.group?.name ?? "Private travel game"}</p>
        </Link>

        <div className="mt-4 rounded-[1.5rem] border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <Avatar src={currentMember?.avatarUrl ?? ""} alt={displayName} className="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <Badge>Level {level}</Badge>
              <p className="mt-2 truncate text-xl font-black">{displayName}</p>
              <p className="text-xs font-semibold text-muted-foreground">{totalXp.toLocaleString()} XP</p>
            </div>
          </div>
          <Progress value={getLevelProgress(totalXp)} className="mt-4" />
        </div>

        <nav className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[1.25rem] border px-4 py-3.5 text-sm font-black transition",
                  active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-transparent bg-card text-foreground hover:border-border"
                )}
              >
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-background text-xl">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:ml-[21rem] lg:px-8">
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
        <div className="fixed inset-x-3 bottom-24 z-50 rounded-[1.5rem] border border-border bg-[#f6ead8] p-3 shadow-xl lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            {overflowNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-2xl bg-card px-3 py-3 text-sm font-black" onClick={() => setShowMore(false)}>
                <span>{item.emoji}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[1.5rem] border border-border bg-[#f6ead8] p-2 shadow-xl shadow-slate-950/15 lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "grid place-items-center gap-1 rounded-[1.1rem] px-2 py-2 text-[10px] font-black transition",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <span className="text-lg">{item.emoji}</span>
                <span>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          {overflowNavItems.length > 0 && (
            <button type="button" className="grid place-items-center gap-1 rounded-[1.1rem] px-2 py-2 text-[10px] font-black text-muted-foreground" onClick={() => setShowMore((value) => !value)}>
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
