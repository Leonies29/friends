"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { signOut } from "firebase/auth";
import { useTheme } from "next-themes";
import { getFirebaseAuth } from "@/firebase/auth";
import { useActiveGroup } from "@/hooks/use-active-group";
import { GAMES_UPDATED_EVENT } from "@/lib/game-events";
import { buildNavigationFromGames, filterVisibleNavItems, isNavItemActive, splitMobileNavigation } from "@/lib/game-navigation";
import { canManageGames, resolveEffectiveRole } from "@/services/permissions";
import { ensureDefaultGames, listGames } from "@/services/game-service";
import { listXpTransactions } from "@/services/xp-service";
import { clearActiveGroupCookie } from "@/lib/session-cookies";
import { cn, calculateLevel, getLevelProgress } from "@/lib/utils";
import { Avatar, Badge, Button, Progress } from "@/components/ui";
import type { Game } from "@/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const state = useActiveGroup();
  const [totalXp, setTotalXp] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const canAdmin = canManageGames(resolveEffectiveRole(state.currentMember, state.group, state.userId));
  const currentMember = state.members.find((member) => member.id === state.userId || member.userId === state.userId);
  const displayName = currentMember?.nickname || currentMember?.username || "Traveler";
  const level = calculateLevel(totalXp);

  const navItems = useMemo(() => buildNavigationFromGames(games, canAdmin), [games, canAdmin]);
  const visibleNavItems = useMemo(() => filterVisibleNavItems(navItems, canAdmin), [navItems, canAdmin]);
  const mobileNavSplit = useMemo(() => splitMobileNavigation(visibleNavItems), [visibleNavItems]);

  useEffect(() => {
    if (!state.group?.id || !state.userId) return;
    void listXpTransactions(state.group.id)
      .then((transactions) => {
        const xp = transactions.filter((item) => item.userId === state.userId).reduce((sum, item) => sum + item.amount, 0);
        setTotalXp(xp);
      })
      .catch(() => undefined);
  }, [state.group?.id, state.userId]);

  useEffect(() => {
    if (!state.group?.id) {
      setGames([]);
      return;
    }
    const reload = () => {
      if (!canAdmin) {
        void listGames(state.group!.id).then(setGames).catch(() => undefined);
        return;
      }
      void ensureDefaultGames(state.group!.id).then(setGames).catch(() => undefined);
    };
    reload();
    window.addEventListener(GAMES_UPDATED_EVENT, reload);
    return () => window.removeEventListener(GAMES_UPDATED_EVENT, reload);
  }, [state.group?.id, pathname, canAdmin]);

  async function logout() {
    await signOut(getFirebaseAuth()).catch(() => undefined);
    document.cookie = "istanbul_quest_session=; path=/; max-age=0; SameSite=Lax";
    clearActiveGroupCookie();
    router.push("/");
  }

  return (
    <div className="min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <aside className="fixed left-4 top-4 z-40 hidden h-[calc(100vh-2rem)] w-80 flex-col rounded-[1.75rem] border border-border bg-surface-warm p-4 shadow-xl shadow-slate-950/10 lg:flex">
        <Link href="/dashboard" className="rounded-[1.5rem] bg-primary p-5 text-primary-foreground">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-primary-foreground/70">Adventure Pass</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-none">Istanbul Quest</h1>
          <p className="mt-2 text-sm font-semibold text-primary-foreground/78">{state.group?.name ?? "Private travel game"}</p>
        </Link>

        <div className="mt-4 rounded-[1.5rem] border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <Link href="/settings" aria-label="Open settings" className="shrink-0 rounded-full transition hover:opacity-90">
              <Avatar src={currentMember?.avatarUrl ?? ""} alt={displayName} className="h-14 w-14" />
            </Link>
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
            const active = isNavItemActive(pathname, item.href);
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
          <Link
            href="/select-group?switch=1"
            className="flex items-center gap-3 rounded-[1.25rem] border border-dashed border-border bg-card px-4 py-3.5 text-sm font-black text-muted-foreground transition hover:border-primary hover:text-foreground"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-background text-xl">🔁</span>
            <span>Switch group</span>
          </Link>
        </nav>
      </aside>

      <div className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 pr-28 backdrop-blur sm:pr-32 lg:ml-[21rem] lg:px-8 lg:pr-8">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Link href="/settings" aria-label="Open settings" className="shrink-0 rounded-full transition hover:opacity-90 lg:hidden">
            <Avatar src={currentMember?.avatarUrl ?? ""} alt={displayName} />
          </Link>
          <Link href="/dashboard" className="min-w-0 flex-1">
            <p className="truncate font-black">{displayName}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">{state.group?.name ?? `Level ${level}`}</p>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:ml-[21rem] lg:px-8">
        {children}
      </main>

      <MobileBottomNav pathname={pathname} split={mobileNavSplit} />
    </div>
  );
}
