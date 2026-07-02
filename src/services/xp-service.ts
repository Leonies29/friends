import { addDoc, collection, doc, getDocs, increment, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { LeaderboardEntry, XpSourceType, XpTransaction } from "@/types";
import { calculateLevel } from "@/lib/utils";

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

