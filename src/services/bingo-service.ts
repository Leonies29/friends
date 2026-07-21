import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { BINGO_CHALLENGES_BY_DESTINATION } from "@/lib/bingo-constants";
import { pickForDestination, type DestinationId } from "@/lib/destinations";
import {
  bingoBonusPoints,
  countValidatedCells,
  detectNewCompletedLines,
  generatePlayerGrid,
  pointsForDifficulty
} from "@/lib/bingo-logic";
import { awardGameXp } from "@/services/xp-service";
import type {
  BingoCard,
  BingoCategory,
  BingoChallenge,
  BingoDifficulty,
  BingoLeaderboardEntry,
  BingoPlayer,
  BingoSession,
  BingoSubmission,
  BingoSubmissionStatus
} from "@/types/bingo";

export const BINGO_CHALLENGES = "bingoChallenges";
export const BINGO_CARDS = "bingoCards";
export const BINGO_SUBMISSIONS = "bingoSubmissions";
export const BINGO_PLAYERS = "bingoPlayers";
export const BINGO_LEADERBOARD = "bingoLeaderboard";
export const BINGO_SESSIONS = "bingoSessions";

function cardDocId(groupId: string, gameId: string, userId: string) {
  return `${groupId}_${gameId}_${userId}`;
}

function sessionDocId(groupId: string, gameId: string) {
  return `${groupId}_${gameId}`;
}

function leaderboardDocId(groupId: string, gameId: string, userId: string) {
  return `${groupId}_${gameId}_${userId}`;
}

export async function ensureBingoChallenges(groupId: string, gameId: string, destinationId?: DestinationId, options?: { seedIfEmpty?: boolean }) {
  const existing = await listBingoChallenges(groupId, gameId);
  if (existing.length) return existing;
  if (options?.seedIfEmpty === false) return existing;

  const db = getFirebaseFirestore();
  const templates = pickForDestination(BINGO_CHALLENGES_BY_DESTINATION, destinationId);
  await Promise.all(templates.map((template, index) =>
    setDoc(doc(db, BINGO_CHALLENGES, `${groupId}_${gameId}_${index}`), {
      groupId,
      gameId,
      title: template.title,
      description: template.description,
      category: template.category,
      difficulty: template.difficulty,
      points: pointsForDifficulty(template.difficulty),
      active: true,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  ));

  return listBingoChallenges(groupId, gameId);
}

export async function listBingoChallenges(groupId: string, gameId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(
    collection(db, BINGO_CHALLENGES),
    where("groupId", "==", groupId),
    where("gameId", "==", gameId)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as BingoChallenge)
    .filter((challenge) => !challenge.archived)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function createBingoChallenge(groupId: string, gameId: string, input: {
  title: string;
  description: string;
  category: BingoCategory;
  difficulty: BingoDifficulty;
  active?: boolean;
}) {
  const db = getFirebaseFirestore();
  const created = await addDoc(collection(db, BINGO_CHALLENGES), {
    groupId,
    gameId,
    title: input.title,
    description: input.description,
    category: input.category,
    difficulty: input.difficulty,
    points: pointsForDifficulty(input.difficulty),
    active: input.active ?? true,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return created.id;
}

export async function updateBingoChallenge(challengeId: string, data: Partial<Pick<BingoChallenge, "title" | "description" | "category" | "difficulty" | "active">>) {
  const db = getFirebaseFirestore();
  const patch: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (data.difficulty) patch.points = pointsForDifficulty(data.difficulty);
  await updateDoc(doc(db, BINGO_CHALLENGES, challengeId), patch);
}

export async function deleteBingoChallenge(challengeId: string) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, BINGO_CHALLENGES, challengeId), { archived: true, active: false, updatedAt: serverTimestamp() });
}

export async function getBingoSession(groupId: string, gameId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, BINGO_SESSIONS, sessionDocId(groupId, gameId)));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BingoSession) : null;
}

export async function launchBingoGame(input: {
  groupId: string;
  gameId: string;
  launchedBy: string;
  players: Array<{ userId: string; displayName: string }>;
}) {
  const challenges = (await listBingoChallenges(input.groupId, input.gameId)).filter((challenge) => challenge.active);
  if (challenges.length < 24) {
    throw new Error("At least 24 active challenges are required to launch bingo.");
  }
  if (!input.players.length) {
    throw new Error("No players in the group.");
  }

  const players = input.players.filter((player) => player.userId?.trim());
  if (!players.length) {
    throw new Error("No players with a valid account were found.");
  }

  const db = getFirebaseFirestore();
  const batch = writeBatch(db);

  players.forEach((player) => {
    const cells = generatePlayerGrid(challenges);
    const cardId = cardDocId(input.groupId, input.gameId, player.userId);
    const validatedCount = countValidatedCells(cells);
    batch.set(doc(db, BINGO_CARDS, cardId), {
      groupId: input.groupId,
      gameId: input.gameId,
      userId: player.userId,
      displayName: player.displayName,
      cells,
      completedLines: [],
      totalPoints: 0,
      bingoCount: 0,
      validatedCount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    batch.set(doc(db, BINGO_PLAYERS, cardId), {
      groupId: input.groupId,
      gameId: input.gameId,
      userId: player.userId,
      displayName: player.displayName,
      totalPoints: 0,
      bingoCount: 0,
      validatedCount,
      updatedAt: serverTimestamp()
    }, { merge: true });

    batch.set(doc(db, BINGO_LEADERBOARD, leaderboardDocId(input.groupId, input.gameId, player.userId)), {
      groupId: input.groupId,
      gameId: input.gameId,
      userId: player.userId,
      displayName: player.displayName,
      totalPoints: 0,
      bingoCount: 0,
      validatedCount,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  batch.set(doc(db, BINGO_SESSIONS, sessionDocId(input.groupId, input.gameId)), {
    groupId: input.groupId,
    gameId: input.gameId,
    status: "active",
    launchedAt: new Date().toISOString(),
    launchedBy: input.launchedBy,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();
}

export async function getBingoCard(groupId: string, gameId: string, userId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, BINGO_CARDS, cardDocId(groupId, gameId, userId)));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BingoCard) : null;
}

export async function ensureBingoCardForPlayer(input: {
  groupId: string;
  gameId: string;
  userId: string;
  displayName: string;
}) {
  const existing = await getBingoCard(input.groupId, input.gameId, input.userId);
  if (existing) return existing;

  const session = await getBingoSession(input.groupId, input.gameId);
  if (session?.status !== "active") return null;

  const challenges = (await listBingoChallenges(input.groupId, input.gameId)).filter((challenge) => challenge.active);
  if (challenges.length < 24) return null;

  const cells = generatePlayerGrid(challenges);
  const validatedCount = countValidatedCells(cells);
  const cardId = cardDocId(input.groupId, input.gameId, input.userId);
  const db = getFirebaseFirestore();
  const batch = writeBatch(db);

  batch.set(doc(db, BINGO_CARDS, cardId), {
    groupId: input.groupId,
    gameId: input.gameId,
    userId: input.userId,
    displayName: input.displayName,
    cells,
    completedLines: [],
    totalPoints: 0,
    bingoCount: 0,
    validatedCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  batch.set(doc(db, BINGO_PLAYERS, cardId), {
    groupId: input.groupId,
    gameId: input.gameId,
    userId: input.userId,
    displayName: input.displayName,
    totalPoints: 0,
    bingoCount: 0,
    validatedCount,
    updatedAt: serverTimestamp()
  }, { merge: true });

  batch.set(doc(db, BINGO_LEADERBOARD, leaderboardDocId(input.groupId, input.gameId, input.userId)), {
    groupId: input.groupId,
    gameId: input.gameId,
    userId: input.userId,
    displayName: input.displayName,
    totalPoints: 0,
    bingoCount: 0,
    validatedCount,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();
  return getBingoCard(input.groupId, input.gameId, input.userId);
}

export async function submitBingoProof(input: {
  groupId: string;
  gameId: string;
  card: BingoCard;
  userId: string;
  userName: string;
  cellIndex: number;
  proofText: string;
}) {
  const cell = input.card.cells[input.cellIndex];
  if (!cell || cell.isFree) throw new Error("This cell cannot be submitted.");
  if (cell.status === "validated" || cell.status === "pending") {
    throw new Error("This cell is already validated or pending.");
  }

  const db = getFirebaseFirestore();
  const submissionRef = await addDoc(collection(db, BINGO_SUBMISSIONS), {
    groupId: input.groupId,
    gameId: input.gameId,
    cardId: input.card.id,
    userId: input.userId,
    userName: input.userName,
    cellIndex: input.cellIndex,
    challengeId: cell.challengeId ?? null,
    challengeTitle: cell.title,
    proofType: "text",
    proofText: input.proofText ?? "",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const nextCells = input.card.cells.map((entry, index) => index === input.cellIndex
    ? { ...entry, status: "pending" as const, submissionId: submissionRef.id, rejectionNote: "" }
    : entry);

  await updateDoc(doc(db, BINGO_CARDS, input.card.id), {
    cells: nextCells,
    updatedAt: serverTimestamp()
  });

  return submissionRef.id;
}

export async function listPendingBingoSubmissions(groupId: string, gameId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(
    collection(db, BINGO_SUBMISSIONS),
    where("groupId", "==", groupId),
    where("gameId", "==", gameId),
    where("status", "==", "pending")
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as BingoSubmission)
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

export async function reviewBingoSubmission(input: {
  submission: BingoSubmission;
  status: Exclude<BingoSubmissionStatus, "pending">;
  adminComment?: string;
  reviewedBy: string;
}) {
  const db = getFirebaseFirestore();
  const cardSnapshot = await getDoc(doc(db, BINGO_CARDS, input.submission.cardId));
  if (!cardSnapshot.exists()) throw new Error("Card not found.");
  const card = { id: cardSnapshot.id, ...cardSnapshot.data() } as BingoCard;

  await updateDoc(doc(db, BINGO_SUBMISSIONS, input.submission.id), {
    status: input.status,
    adminComment: input.adminComment ?? "",
    reviewedBy: input.reviewedBy,
    reviewedAt: new Date().toISOString(),
    updatedAt: serverTimestamp()
  });

  if (input.status === "rejected") {
    const nextCells = card.cells.map((cell, index) => index === input.submission.cellIndex
      ? {
          ...cell,
          status: "rejected" as const,
          submissionId: null,
          rejectionNote: input.adminComment?.trim() || "Proof rejected — try again with more detail."
        }
      : cell);
    await updateDoc(doc(db, BINGO_CARDS, card.id), { cells: nextCells, updatedAt: serverTimestamp() });
    return { approved: false, newLines: [] as string[] };
  }

  const cell = card.cells[input.submission.cellIndex];
  const nextCells = card.cells.map((entry, index) => index === input.submission.cellIndex
    ? { ...entry, status: "validated" as const, submissionId: input.submission.id }
    : entry);

  const newLines = detectNewCompletedLines(nextCells, card.completedLines);
  const challengePoints = cell?.points ?? 0;
  const bonusPoints = bingoBonusPoints(newLines);
  const gainedPoints = challengePoints + bonusPoints;
  const validatedCount = countValidatedCells(nextCells);
  const completedLines = [...card.completedLines, ...newLines];
  const totalPoints = card.totalPoints + gainedPoints;
  const bingoCount = card.bingoCount + newLines.length;

  await updateDoc(doc(db, BINGO_CARDS, card.id), {
    cells: nextCells,
    completedLines,
    totalPoints,
    bingoCount,
    validatedCount,
    updatedAt: serverTimestamp()
  });

  const playerId = cardDocId(card.groupId, card.gameId, card.userId);
  await setDoc(doc(db, BINGO_PLAYERS, playerId), {
    groupId: card.groupId,
    gameId: card.gameId,
    userId: card.userId,
    displayName: card.displayName,
    totalPoints,
    bingoCount,
    validatedCount,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, BINGO_LEADERBOARD, leaderboardDocId(card.groupId, card.gameId, card.userId)), {
    groupId: card.groupId,
    gameId: card.gameId,
    userId: card.userId,
    displayName: card.displayName,
    totalPoints,
    bingoCount,
    validatedCount,
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (gainedPoints > 0) {
    await awardGameXp({
      groupId: card.groupId,
      gameId: card.gameId,
      userId: card.userId,
      amount: gainedPoints,
      sourceType: "game",
      sourceId: input.submission.id,
      reason: newLines.length
        ? `Bingo validated (+${gainedPoints} pts, ${newLines.length} line${newLines.length > 1 ? "s" : ""})`
        : `Bingo challenge validated (+${challengePoints} pts)`,
      createdBy: input.reviewedBy
    });
  }

  return { approved: true, newLines, gainedPoints };
}

export async function listBingoLeaderboard(groupId: string, gameId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(
    collection(db, BINGO_LEADERBOARD),
    where("groupId", "==", groupId),
    where("gameId", "==", gameId)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as BingoLeaderboardEntry)
    .sort((a, b) => b.totalPoints - a.totalPoints || b.bingoCount - a.bingoCount || b.validatedCount - a.validatedCount);
}

export async function getBingoPlayerStats(groupId: string, gameId: string, userId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, BINGO_PLAYERS, cardDocId(groupId, gameId, userId)));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BingoPlayer) : null;
}
