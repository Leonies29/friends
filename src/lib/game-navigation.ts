import type { Game, GameCategory } from "@/types";

export type AppNavItem = {
  href: string;
  label: string;
  emoji: string;
  adminOnly?: boolean;
  order: number;
};

export type MobileBottomSlot = {
  id: "home" | "games" | "ranking" | "menu";
  label: string;
  emoji: string;
  href?: string;
};

export type MobileNavSplit = {
  gameItems: AppNavItem[];
  menuItems: AppNavItem[];
};

const CATEGORY_NAV: Record<GameCategory, { href: string; emoji: string; label: string }> = {
  assassin: { href: "/assassin", emoji: "🔪", label: "Assassin" },
  challenge: { href: "/challenges", emoji: "✨", label: "Challenges" },
  photo: { href: "/photos", emoji: "📸", label: "Travel Album" },
  treasure: { href: "/questline", emoji: "🗺️", label: "Quests" },
  quiz: { href: "/quiz", emoji: "❓", label: "History Quiz" },
  bingo: { href: "/bingo", emoji: "🎯", label: "Travel Bingo" },
  custom: { href: "/challenges", emoji: "🎮", label: "Custom" }
};

const CORE_NAV: AppNavItem[] = [
  { href: "/dashboard", label: "Home", emoji: "🏠", order: 0 },
  { href: "/leaderboard", label: "Ranking", emoji: "🏆", order: 10 },
  { href: "/schedule", label: "Planner", emoji: "📅", order: 20 },
  { href: "/awards", label: "Awards", emoji: "🏅", order: 90 },
  { href: "/ceremony", label: "Ceremony", emoji: "🎊", order: 95 }
];

const MENU_HREFS = new Set(["/schedule", "/awards", "/admin", "/ceremony", "/badges"]);

export const MOBILE_BOTTOM_SLOTS: MobileBottomSlot[] = [
  { id: "home", label: "Home", emoji: "🏠", href: "/dashboard" },
  { id: "games", label: "Games", emoji: "🎮" },
  { id: "ranking", label: "Rank", emoji: "🏆", href: "/leaderboard" },
  { id: "menu", label: "Menu", emoji: "☰" }
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

export function splitMobileNavigation(allItems: AppNavItem[]): MobileNavSplit {
  const gameItems = allItems.filter(
    (item) => !CORE_NAV.some((core) => core.href === item.href) && !item.adminOnly && !MENU_HREFS.has(item.href)
  );
  const menuItems: AppNavItem[] = [
    { href: "/select-group?switch=1", label: "Switch group", emoji: "🔁", order: 5 },
    ...allItems.filter((item) => MENU_HREFS.has(item.href) || item.adminOnly)
  ];
  return { gameItems, menuItems };
}

export function normalizeAppPathname(pathname: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  let normalized = pathname.split("?")[0] ?? pathname;
  if (basePath && normalized.startsWith(basePath)) {
    normalized = normalized.slice(basePath.length) || "/";
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function isNavItemActive(pathname: string, href: string) {
  const current = normalizeAppPathname(pathname);
  const target = normalizeAppPathname(href.split("?")[0] ?? href);
  return current === target;
}

export function isMobileBottomSlotActive(slot: MobileBottomSlot, pathname: string, split: MobileNavSplit) {
  if (slot.id === "home") return isNavItemActive(pathname, "/dashboard");
  if (slot.id === "ranking") return isNavItemActive(pathname, "/leaderboard");
  if (slot.id === "games") return split.gameItems.some((item) => isNavItemActive(pathname, item.href));
  if (slot.id === "menu") return split.menuItems.some((item) => isNavItemActive(pathname, item.href));
  return false;
}

export function filterVisibleNavItems(items: AppNavItem[], canAdmin: boolean) {
  return items.filter((item) => !item.adminOnly || canAdmin);
}
