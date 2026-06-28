import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLevelProgress(totalXp: number) {
  const currentLevelXp = totalXp % 500;
  return Math.round((currentLevelXp / 500) * 100);
}

export function calculateLevel(totalXp: number) {
  return Math.floor(totalXp / 500) + 1;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}

export function readinessPercent(readiness: Record<string, "ready" | "not-ready">) {
  const values = Object.values(readiness);
  if (!values.length) return 0;
  return Math.round((values.filter((value) => value === "ready").length / values.length) * 100);
}
