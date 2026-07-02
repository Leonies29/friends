"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  MOBILE_BOTTOM_SLOTS,
  isMobileBottomSlotActive,
  isNavItemActive,
  type AppNavItem,
  type MobileNavSplit
} from "@/lib/game-navigation";
import { cn } from "@/lib/utils";

type MobileSheet = "games" | "menu" | null;

function NavSheetLink({
  item,
  pathname,
  onClose
}: {
  item: AppNavItem;
  pathname: string;
  onClose: () => void;
}) {
  const active = isNavItemActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-black transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-transparent bg-card text-foreground hover:border-border"
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-background text-xl">{item.emoji}</span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function NavSheet({
  title,
  items,
  pathname,
  onClose,
  sections
}: {
  title: string;
  items: AppNavItem[];
  pathname: string;
  onClose: () => void;
  sections?: { title: string; items: AppNavItem[] }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 px-3 lg:hidden"
    >
      <div className="overflow-hidden rounded-[1.5rem] border border-border bg-[#f6ead8] shadow-2xl shadow-slate-950/20">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">{title}</p>
          <button
            type="button"
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(52vh,24rem)] overflow-y-auto p-3">
          {sections ? (
            <div className="grid gap-4">
              {sections.map((section) => (
                <div key={section.title}>
                  <p className="px-1 pb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">{section.title}</p>
                  <div className="grid gap-2">
                    {section.items.map((item) => (
                      <NavSheetLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm font-semibold text-muted-foreground">
              No games enabled yet. Ask an admin to activate them.
            </p>
          ) : (
            <div className="grid gap-2">
              {items.map((item) => (
                <NavSheetLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function MobileBottomNav({
  pathname,
  split
}: {
  pathname: string;
  split: MobileNavSplit;
}) {
  const [sheet, setSheet] = useState<MobileSheet>(null);

  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  useEffect(() => {
    if (!sheet) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSheet(null);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sheet]);

  const sheetItems = sheet === "games" ? split.gameItems : sheet === "menu" ? split.menuItems : [];
  const sheetTitle = sheet === "games" ? "Games" : "Menu";
  const menuSections = sheet === "menu"
    ? [
        {
          title: "Trip",
          items: split.menuItems.filter((item) => !item.adminOnly)
        },
        {
          title: "Admin",
          items: split.menuItems.filter((item) => item.adminOnly)
        }
      ].filter((section) => section.items.length > 0)
    : undefined;

  return (
    <>
      <AnimatePresence>
        {sheet && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
              onClick={() => setSheet(null)}
            />
            <NavSheet
              title={sheetTitle}
              items={sheetItems}
              pathname={pathname}
              onClose={() => setSheet(null)}
              sections={menuSections}
            />
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 rounded-[1.5rem] border border-border bg-[#f6ead8] p-2 shadow-xl shadow-slate-950/15 lg:hidden"
      >
        <div className="grid grid-cols-4 gap-1">
          {MOBILE_BOTTOM_SLOTS.map((slot) => {
            const opensSheet = slot.id === "games" || slot.id === "menu";
            const sheetId = opensSheet ? (slot.id as "games" | "menu") : null;
            const routeActive = isMobileBottomSlotActive(slot, pathname, split);
            const sheetOpen = sheetId !== null && sheet === sheetId;
            const active = routeActive || sheetOpen;

            if (opensSheet) {
              return (
                <button
                  key={slot.id}
                  type="button"
                  aria-expanded={sheet === sheetId}
                  aria-controls={`mobile-nav-${slot.id}`}
                  id={`mobile-nav-${slot.id}`}
                  onClick={() => setSheet((current) => (current === sheetId ? null : sheetId))}
                  className={cn(
                    "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-[1.1rem] px-1 py-2 text-[11px] font-black leading-none transition",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <span className="text-lg leading-none">{slot.emoji}</span>
                  <span className="truncate">{slot.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={slot.id}
                href={slot.href!}
                onClick={() => setSheet(null)}
                className={cn(
                  "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-[1.1rem] px-1 py-2 text-[11px] font-black leading-none transition",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <span className="text-lg leading-none">{slot.emoji}</span>
                <span className="truncate">{slot.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
