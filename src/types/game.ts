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
  archived?: boolean;
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
  visible?: boolean;
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
  phase?: "normal" | "duel";
  setupMode?: AssassinSetupMode;
  startedAt?: string;
  endedAt?: string;
  winnerId?: string;
  startingLives?: number;
}

export type AssassinSetupMode = "random" | "designer" | "hybrid";
export type AssassinMissionCategory = "Speech" | "Photo" | "Object" | "Location" | "Social" | "Funny";
export type AssassinMissionDifficulty = "Easy" | "Medium" | "Hard" | "Epic";

export interface AssassinMissionTemplate {
  id: string;
  groupId: string;
  title: string;
  text: string;
  difficulty: AssassinMissionDifficulty;
  category: AssassinMissionCategory;
  xpReward: number;
  assassinPointsReward: number;
  active: boolean;
  archived?: boolean;
}

export interface AssassinAssignmentDraft {
  playerId: string;
  playerName: string;
  targetId: string;
  targetName: string;
  missionText: string;
  templateId?: string | null;
  locked?: boolean;
}

export interface AssassinSetupDoc {
  id: string;
  groupId: string;
  mode: AssassinSetupMode;
  assignments: AssassinAssignmentDraft[];
  updatedAt?: string;
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
  lives: number;
  maxLives: number;
  assassinPoints: number;
  missionsCompleted: number;
  victories: number;
  currentStreak: number;
  bestStreak: number;
  xpEarned: number;
  lastCompletedAt?: string | null;
}

export interface AssassinMission {
  id: string;
  groupId: string;
  playerId: string;
  targetId: string;
  missionText: string;
  templateId?: string | null;
  difficulty?: AssassinMissionDifficulty;
  xpReward?: number;
  assassinPointsReward?: number;
  status?: "active" | "completed";
  skipped?: boolean;
  assignedAt?: string;
  completedAt?: string | null;
}

export interface AssassinElimination {
  id: string;
  groupId: string;
  killerId: string;
  victimId: string;
  status: "pending" | "confirmed" | "contested" | "rejected";
  createdAt: string;
  resolvedAt?: string;
  missionId?: string | null;
  rewardXp?: number;
  rewardPoints?: number;
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
