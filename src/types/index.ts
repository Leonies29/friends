export type Difficulty = "Easy" | "Medium" | "Hard";
export type ReactionType = "funny" | "legendary" | "favorite";
export type ReadinessStatus = "ready" | "not-ready";

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  level: number;
  totalXp: number;
  joinedAt: string;
  isAdmin?: boolean;
  stats: UserStats;
  badges: Badge[];
  achievements: Achievement[];
}

export interface UserStats {
  challengesCompleted: number;
  assassinations: number;
  photosUploaded: number;
  pointsEarned: number;
  relicsCollected: number;
  catsFound: number;
}

export interface Challenge {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xpReward: number;
  proof?: CompletionProof;
  status: "secret" | "submitted" | "approved";
}

export interface CompletionProof {
  type: "photo" | "video-url" | "description";
  value: string;
  submittedAt: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  relics: Relic[];
  completionBadgeId: string;
}

export interface Relic {
  id: string;
  label: string;
  icon: string;
  xpReward: number;
  collectedBy?: string;
  collectedAt?: string;
}

export interface Photo {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  reactions: Reaction[];
}

export interface Reaction {
  id: string;
  userId: string;
  type: ReactionType;
  xpGranted: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  xpReward: number;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  meetingLocation: string;
  notes: string;
  readiness: Record<string, ReadinessStatus>;
}

export interface AssassinMission {
  id: string;
  playerId: string;
  targetId: string;
  condition: string;
  status: "active" | "completed" | "eliminated";
  xpReward: number;
  completedAt?: string;
}

export interface EliminationRecord {
  id: string;
  assassinId: string;
  targetId: string;
  condition: string;
  completedAt: string;
}

export interface WorldEvent {
  id: string;
  title: string;
  description: string;
  effect: string;
  startsAt: string;
  endsAt: string;
  accent: string;
}

export interface FunAward {
  id: string;
  title: string;
  winnerId: string;
  reason: string;
}
