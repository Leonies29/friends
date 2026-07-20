import type { AssassinMissionDifficulty } from "@/types/game";

export interface AssassinProgressionSnapshot {
  level: number;
  title: string;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

const LEVEL_TITLES: Array<{ level: number; title: string }> = [
  { level: 1, title: "Recruit" },
  { level: 5, title: "Secret Agent" },
  { level: 10, title: "Assassin" },
  { level: 20, title: "Phantom" },
  { level: 50, title: "Legend" }
];

export function getXpRequiredForLevel(level: number) {
  if (level <= 1) return 0;
  return Math.round(120 * Math.pow(1.28, level - 1));
}

export function calculateAssassinLevel(totalXp: number) {
  let level = 1;
  while (getXpRequiredForLevel(level + 1) <= totalXp) {
    level += 1;
  }
  return level;
}

export function getAssassinLevelTitle(level: number) {
  const title = LEVEL_TITLES.filter((item) => item.level <= level).at(-1);
  return title?.title ?? "Operative";
}

export function getAssassinProgression(totalXp: number): AssassinProgressionSnapshot {
  const level = calculateAssassinLevel(totalXp);
  const currentLevelXp = totalXp - getXpRequiredForLevel(level);
  const nextLevelXp = getXpRequiredForLevel(level + 1) - getXpRequiredForLevel(level);
  const progressPercent = nextLevelXp > 0 ? Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100)) : 100;
  return {
    level,
    title: getAssassinLevelTitle(level),
    xpForCurrentLevel: currentLevelXp,
    xpForNextLevel: nextLevelXp,
    progressPercent
  };
}

export function getAssassinMissionRewards(difficulty: AssassinMissionDifficulty) {
  switch (difficulty) {
    case "Easy":
      return { xpReward: 10, assassinPointsReward: 10 };
    case "Medium":
      return { xpReward: 20, assassinPointsReward: 20 };
    case "Hard":
      return { xpReward: 40, assassinPointsReward: 40 };
    case "Epic":
      return { xpReward: 75, assassinPointsReward: 75 };
    default:
      return { xpReward: 10, assassinPointsReward: 10 };
  }
}

export function getAssassinEliminationRewards() {
  return { xpReward: 100, assassinPointsReward: 100 };
}

export function getAssassinVictoryReward() {
  return { assassinPointsReward: 250 };
}
