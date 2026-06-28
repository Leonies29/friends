"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
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
import { cn } from "@/lib/utils";
import { Avatar, Button, Progress } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/photos", label: "Photo Wall", icon: Camera },
  { href: "/challenges", label: "Challenges", icon: Sparkles },
  { href: "/assassin", label: "Assassin", icon: Shield },
  { href: "/questline", label: "Questline", icon: Gamepad2 },
  { href: "/badges", label: "Badges", icon: BadgeCheck },
  { href: "/awards", label: "Awards", icon: Crown },
  { href: "/admin", label: "Admin", icon: WandSparkles }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [catsFound, setCatsFound] = useState(currentUser.stats.catsFound);

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <aside className="fixed left-4 top-4 z-40 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-[2rem] border border-border bg-background/70 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl lg:flex">
        <Link href="/dashboard" className="turkish-tile rounded-[1.5rem] bg-primary p-5 text-primary-foreground">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-primary-foreground/70">Private trip</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Istanbul Quest</h1>
          <p className="text-sm text-primary-foreground/80">7 Days. 1 City. Endless Memories.</p>
        </Link>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition",
                  active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          className="group mt-4 rounded-[1.5rem] border border-dashed border-accent/50 bg-accent/10 p-4 text-left"
          onClick={() => setCatsFound((value) => Math.min(50, value + 1))}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/20 text-accent transition group-hover:rotate-12">
              <Cat className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold">Hidden Cats</p>
              <p className="text-xs text-muted-foreground">Click cats for +15 XP</p>
            </div>
          </div>
          <Progress value={(catsFound / 50) * 100} className="mt-3" />
          <p className="mt-2 text-xs font-bold text-muted-foreground">Cats Found {catsFound}/50</p>
        </button>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-2xl lg:ml-80 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar src={currentUser.avatarUrl} alt={currentUser.username} />
            <div>
              <p className="font-bold">{currentUser.username}</p>
              <p className="text-xs text-muted-foreground">Level {currentUser.level} � {currentUser.totalXp.toLocaleString()} XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-7xl px-4 py-6 lg:ml-80 lg:px-8"
      >
        {children}
      </motion.main>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 gap-1 rounded-[1.5rem] border border-border bg-background/80 p-2 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl lg:hidden">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("grid place-items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold", active ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              <Icon className="h-4 w-4" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
