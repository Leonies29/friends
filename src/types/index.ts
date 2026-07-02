export type EntityTimestamp = string | Date | { seconds: number; nanoseconds: number } | null;

export type Difficulty = "Easy" | "Medium" | "Hard";
export type ReactionType = "like" | "funny" | "legendary" | "favorite";
export type AttendanceStatus = "ready" | "late" | "unavailable";
export type ReadinessStatus = AttendanceStatus | "not-ready";
export type GroupRole = "OWNER" | "ADMIN" | "PLAYER";
export type GroupStatus = "setup" | "active" | "completed" | "archived";
export type GameStatus = "draft" | "active" | "inactive" | "archived";
export type GameCategory = "challenge" | "photo" | "treasure" | "quiz" | "bingo" | "assassin" | "custom";
export type ChallengeStatus = "draft" | "scheduled" | "secret" | "active" | "submitted" | "approved" | "rejected" | "archived";
export type QuestStatus = "draft" | "visible" | "hidden" | "archived";
export type PhotoStatus = "visible" | "featured" | "deleted" | "hidden";
export type XpSourceType = "challenge" | "quest" | "photo" | "reaction" | "admin_adjustment" | "badge" | "game";

export interface BaseEntity {
  id: string;
  createdAt?: EntityTimestamp;
  updatedAt?: EntityTimestamp;
}

export interface GroupScopedEntity extends BaseEntity {
  groupId: string;
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  avatarUrl: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  level: number;
  totalXp: number;
  joinedAt: string;
  groupIds?: string[];
  activeGroupId?: string;
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

export interface ParticipantSlot {
  id: string;
  nickname: string;
  claimedBy?: string | null;
  claimedAt?: EntityTimestamp;
  createdAt?: EntityTimestamp;
}

export interface Group extends BaseEntity {
  name: string;
  inviteCode: string;
  description: string;
  destination: string;
  dates: string;
  startDate?: string;
  endDate?: string;
  createdBy: string | null;
  ownerId?: string | null;
  status: GroupStatus;
  memberIds: string[];
  plannedMembers: ParticipantSlot[];
  gameIds?: string[];
  gameModes?: string[];
  gameStarted?: boolean;
  currentDay?: number;
  vibe?: string;
}

export interface FriendGroup extends Group {}

export interface GroupMember extends GroupScopedEntity {
  userId: string;
  role: GroupRole;
  nickname: string;
  email?: string;
  avatarUrl?: string | null;
  participantSlotId?: string;
  status: "pending" | "active" | "removed";
  joinedAt?: EntityTimestamp;
  removedAt?: EntityTimestamp;
}

export interface RolePermissions {
  canDeleteGroup: boolean;
  canManageSettings: boolean;
  canManageMembers: boolean;
  canManageGames: boolean;
  canManageScores: boolean;
  canManagePlanning: boolean;
  canUploadPhotos: boolean;
  canViewRankings: boolean;
}

export interface XpRule {
  id: string;
  label: string;
  amount: number;
  sourceType: XpSourceType;
  limitPerUser?: number;
}

export interface Game extends GroupScopedEntity {
  title: string;
  description: string;
  icon: string;
  category: GameCategory;
  enabled: boolean;
  visible: boolean;
  archived: boolean;
  status: GameStatus;
  order: number;
  xpRules: XpRule[];
  duplicatedFromId?: string;
  activatedAt?: EntityTimestamp;
  deactivatedAt?: EntityTimestamp;
  settings?: GameSettings;
}

export interface GameSettings {
  albumUrl?: string;
  checklistItems?: GameChecklistItem[];
}

export interface GameChecklistItem {
  id: string;
  title: string;
  description: string;
  xpReward: number;
}

export interface GameSession extends GroupScopedEntity {
  gameId: string;
  title: string;
  status: "scheduled" | "active" | "paused" | "completed" | "cancelled";
  startsAt?: EntityTimestamp;
  endsAt?: EntityTimestamp;
  settings?: Record<string, unknown>;
}

export interface Challenge extends GroupScopedEntity {
  gameId?: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xpReward: number;
  proof?: CompletionProof;
  status: ChallengeStatus;
  scheduledFor?: EntityTimestamp;
  approvedBy?: string;
  approvedAt?: EntityTimestamp;
}

export interface CompletionProof {
  type: "photo" | "video-url" | "description";
  value: string;
  submittedAt: string;
}

export interface Quest extends GroupScopedEntity {
  gameId?: string;
  name: string;
  title?: string;
  description: string;
  status: QuestStatus;
  visible: boolean;
  relics: Relic[];
  completionBadgeId: string;
}

export interface Relic {
  id: string;
  label: string;
  icon: string;
  xpReward: number;
  collectedBy?: string;
  collectedByName?: string;
  collectedAt?: EntityTimestamp;
}

export interface Photo extends GroupScopedEntity {
  userId?: string;
  challengeId?: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  photoUrl?: string;
  imageUrl?: string;
  fileName?: string;
  storagePath?: string;
  caption: string;
  uploadedAt?: EntityTimestamp;
  validated?: boolean;
  status: PhotoStatus;
  featured: boolean;
  commentCount?: number;
  reactionCounts?: Record<ReactionType, number>;
  createdAt: string;
  reactions: Reaction[];
}

export interface PhotoReaction extends GroupScopedEntity {
  photoId: string;
  userId: string;
  type: ReactionType;
  xpGranted: number;
}

export interface Reaction {
  id: string;
  userId: string;
  type: ReactionType;
  xpGranted: number;
}

export interface PhotoComment extends GroupScopedEntity {
  photoId: string;
  userId: string;
  userName: string;
  body: string;
}

export interface Badge extends BaseEntity {
  groupId?: string;
  name: string;
  description: string;
  icon: string;
  xpReward?: number;
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

export interface ScheduleAttendance {
  userId: string;
  status: AttendanceStatus;
  updatedAt?: EntityTimestamp;
}

export interface ScheduleEvent extends GroupScopedEntity {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  notes?: string;
  attendance: Record<string, AttendanceStatus>;
  // Compatibility fields used by the current UI and seed data.
  time?: string;
  meetingLocation?: string;
  readiness?: Record<string, ReadinessStatus>;
}

export interface LeaderboardEntry extends GroupScopedEntity {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  level: number;
  totalXp: number;
  weeklyXp: number;
  position?: number;
  weekKey?: string;
}

export interface XpTransaction extends GroupScopedEntity {
  userId: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId?: string;
  reason: string;
  createdBy: string;
  weekKey: string;
}

export interface Notification extends GroupScopedEntity {
  userId?: string;
  title: string;
  body: string;
  readBy: string[];
  type: "system" | "game" | "photo" | "planning" | "admin";
}

export interface AssassinMission extends GroupScopedEntity {
  playerId: string;
  targetId: string;
  condition: string;
  status: "active" | "completed" | "eliminated";
  xpReward: number;
  completedAt?: string;
}

export interface EliminationRecord extends GroupScopedEntity {
  assassinId: string;
  targetId: string;
  condition: string;
  completedAt: string;
}

export interface WorldEvent extends GroupScopedEntity {
  title: string;
  description: string;
  effect: string;
  startsAt: string;
  endsAt: string;
  accent: string;
}

export interface FunAward extends GroupScopedEntity {
  title: string;
  winnerId: string;
  reason: string;
}
