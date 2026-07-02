import type { Game, GameCategory } from "@/types";

export type AppNavItem = {
  href: string;
  label: string;
  emoji: string;
  adminOnly?: boolean;
  order: number;
};

const CATEGORY_NAV: Record<GameCategory, { href: string; emoji: string; label: string }> = {
  assassin: { href: "/assassin", emoji: "🔪", label: "Assassin" },
  challenge: { href: "/challenges", emoji: "✨", label: "Challenges" },
  photo: { href: "/photos", emoji: "📸", label: "Travel Album" },
  treasure: { href: "/questline", emoji: "🗺️", label: "Quests" },
  quiz: { href: "/badges", emoji: "❓", label: "Quiz" },
  bingo: { href: "/badges", emoji: "🎯", label: "Bingo" },
  custom: { href: "/challenges", emoji: "🎮", label: "Custom" }
};

const CORE_NAV: AppNavItem[] = [
  { href: "/dashboard", label: "Home", emoji: "🏠", order: 0 },
  { href: "/leaderboard", label: "Ranking", emoji: "🏆", order: 10 },
  { href: "/schedule", label: "Planner", emoji: "📅", order: 20 },
  { href: "/awards", label: "Awards", emoji: "🏅", order: 90 }
];

export function isGameInMenu(game: Pick<Game, "enabled" | "visible" | "archived">) {
  return Boolean(game.enabled && game.visible && !game.archived);
}

export function getGameNavTarget(category: GameCategory) {
  return CATEGORY_NAV[category] ?? CATEGORY_NAV.custom;
}

export function buildNavigationFromGames(games: Game[], canAdmin: boolean) {
  const activeGames = games
    .filter((game) => isGameInMenu(game))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const gameNav: AppNavItem[] = [];
  const seenHrefs = new Set<string>();

  activeGames.forEach((game, index) => {
    const mapping = getGameNavTarget(game.category);
    if (seenHrefs.has(mapping.href)) return;
    seenHrefs.add(mapping.href);
    gameNav.push({
      href: mapping.href,
      label: game.title,
      emoji: mapping.emoji,
      order: 30 + index
    });
  });

  const adminNav: AppNavItem[] = canAdmin
    ? [{ href: "/admin", label: "Admin", emoji: "⚙️", adminOnly: true, order: 100 }]
    : [];

  return [...CORE_NAV, ...gameNav, ...adminNav].sort((a, b) => a.order - b.order);
}

export function buildMobilePrimaryNav(allItems: AppNavItem[]) {
  const home = allItems.find((item) => item.href === "/dashboard");
  const ranking = allItems.find((item) => item.href === "/leaderboard");
  const gameItems = allItems.filter((item) => !CORE_NAV.some((core) => core.href === item.href) && !item.adminOnly);
  const picks = [home, ...gameItems.slice(0, 3), ranking].filter(Boolean) as AppNavItem[];
  return picks.slice(0, 5);
}

export function filterVisibleNavItems(items: AppNavItem[], canAdmin: boolean) {
  return items.filter((item) => !item.adminOnly || canAdmin);
}
