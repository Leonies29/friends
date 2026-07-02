export type QuestCategory = "istanbul_legends" | "bosphorus" | "food_hunter" | "turkish_treasures" | "chaos";
export type QuestDifficulty = "Easy" | "Medium" | "Hard" | "Legendary";
export type SecretQuestDifficulty = "Rare" | "Epic" | "Legendary";

export interface QuestTemplate {
  key: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty | SecretQuestDifficulty;
  xpReward: number;
  isSecret: boolean;
  secretDifficulty?: SecretQuestDifficulty;
  unlockRequiresAllSecrets?: boolean;
}

export interface QuestDoc {
  id: string;
  groupId: string;
  key: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty | SecretQuestDifficulty;
  xpReward: number;
  isSecret: boolean;
  unlocked: boolean;
  completedBy: string[];
}

export interface QuestCompletion {
  id: string;
  groupId: string;
  questId: string;
  userId: string;
  comment?: string;
  completedAt: string;
}

export interface AwardCategory {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export interface AwardVote {
  id: string;
  groupId: string;
  awardId: string;
  voterId: string;
  targetUserId: string | null;
  isWhiteVote: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssassinGame {
  id: string;
  groupId: string;
  status: "setup" | "active" | "finished";
  startedAt?: string;
  endedAt?: string;
}

export interface AssassinPlayer {
  id: string;
  groupId: string;
  uid: string;
  displayName: string;
  avatarUrl: string;
  isAlive: boolean;
  currentTargetId: string | null;
  eliminationCount: number;
}

export interface AssassinMission {
  id: string;
  groupId: string;
  playerId: string;
  targetId: string;
  missionText: string;
  assignedAt?: string;
}

export interface AssassinElimination {
  id: string;
  groupId: string;
  killerId: string;
  victimId: string;
  status: "pending" | "confirmed" | "contested";
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  groupId: string;
  type: "quest" | "elimination" | "secret_unlock";
  title: string;
  subtitle: string;
  createdAt: string;
}

export interface PlannerEventDoc {
  id: string;
  groupId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
}
