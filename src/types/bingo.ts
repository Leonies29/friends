export type BingoDifficulty = "common" | "rare" | "legendary";
export type BingoCategory = "social" | "travel" | "group" | "istanbul" | "custom";
export type BingoCellStatus = "open" | "pending" | "validated" | "rejected";
export type BingoSubmissionStatus = "pending" | "approved" | "rejected";
export type BingoProofType = "text";
export type BingoSessionStatus = "setup" | "active" | "completed";

export interface BingoChallenge {
  id: string;
  groupId: string;
  gameId: string;
  title: string;
  description: string;
  category: BingoCategory;
  difficulty: BingoDifficulty;
  points: number;
  active: boolean;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BingoCell {
  index: number;
  row: number;
  col: number;
  challengeId?: string | null;
  title: string;
  description: string;
  category: BingoCategory;
  difficulty: BingoDifficulty;
  points: number;
  isFree?: boolean;
  status: BingoCellStatus;
  submissionId?: string | null;
  rejectionNote?: string;
}

export interface BingoCard {
  id: string;
  groupId: string;
  gameId: string;
  userId: string;
  displayName: string;
  cells: BingoCell[];
  completedLines: string[];
  totalPoints: number;
  bingoCount: number;
  validatedCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BingoSubmission {
  id: string;
  groupId: string;
  gameId: string;
  cardId: string;
  userId: string;
  userName: string;
  cellIndex: number;
  challengeId?: string | null;
  challengeTitle: string;
  proofType: BingoProofType;
  proofText?: string;
  status: BingoSubmissionStatus;
  adminComment?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BingoPlayer {
  id: string;
  groupId: string;
  gameId: string;
  userId: string;
  displayName: string;
  totalPoints: number;
  bingoCount: number;
  validatedCount: number;
  updatedAt?: string;
}

export interface BingoLeaderboardEntry {
  id: string;
  groupId: string;
  gameId: string;
  userId: string;
  displayName: string;
  totalPoints: number;
  bingoCount: number;
  validatedCount: number;
  updatedAt?: string;
}

export interface BingoSession {
  id: string;
  groupId: string;
  gameId: string;
  status: BingoSessionStatus;
  launchedAt?: string | null;
  launchedBy?: string | null;
  updatedAt?: string;
}
