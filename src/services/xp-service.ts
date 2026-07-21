import { addDoc, collection, doc, getDocs, increment, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { LeaderboardEntry, XpSourceType, XpTransaction } from "@/types";
import { calculateLevel } from "@/lib/utils";
import { getGame } from "@/services/game-service";
import { getGameTeamMembership, listGameTeamMembers } from "@/services/team-service";

export const XP_TRANSACTIONS_COLLECTION = "xpTransactions";
export const LEADERBOARDS_COLLECTION = "leaderboards";

export function getWeekKey(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function addXpTransaction(input: {
  groupId: string;
  userId: string;
  gameId?: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId?: string;
  reason: string;
  createdBy: string;
}) {
  const db = getFirebaseFirestore();
  const weekKey = getWeekKey();
  const transaction: Omit<XpTransaction, "id"> = {
    ...input,
    weekKey
  };

  await addDoc(collection(db, XP_TRANSACTIONS_COLLECTION), {
    ...transaction,
    createdAt: serverTimestamp()
  });

  const leaderboardId = `${input.groupId}_${input.userId}`;
  await setDoc(doc(db, LEADERBOARDS_COLLECTION, leaderboardId), {
    id: leaderboardId,
    groupId: input.groupId,
    userId: input.userId,
    totalXp: increment(input.amount),
    weeklyXp: increment(input.amount),
    weekKey,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// Single entry point for any XP tied to a specific game — the only place that decides who
// actually receives it. If the game is in team mode, it fans out to every teammate of the
// acting player in that game (same amount each, no split); otherwise it's a plain individual
// award. A player with no team assignment yet in a team-mode game gets nothing until an admin
// assigns them (see team-management-panel.tsx's "unassigned" banner).
export async function awardGameXp(input: {
  groupId: string;
  gameId: string;
  userId: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId?: string;
  reason: string;
  createdBy: string;
}) {
  const game = await getGame(input.gameId);

  if (game?.settings?.scoringMode !== "team") {
    await addXpTransaction(input);
    return;
  }

  const membership = await getGameTeamMembership(input.groupId, input.gameId, input.userId);
  if (!membership?.teamId) return;

  const teammateUserIds = await listGameTeamMembers(input.groupId, input.gameId, membership.teamId);
  await Promise.all(teammateUserIds.map((userId) => addXpTransaction({ ...input, userId })));
}

export async function listXpTransactions(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, XP_TRANSACTIONS_COLLECTION), where("groupId", "==", groupId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as XpTransaction);
}

export function buildLeaderboardRows(entries: LeaderboardEntry[]) {
  return [...entries]
    .map((entry) => ({
      ...entry,
      level: calculateLevel(entry.totalXp)
    }))
    .sort((a, b) => b.totalXp - a.totalXp)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

