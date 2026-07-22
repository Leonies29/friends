import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";

export type PendingApprovals = {
  challenges: number;
  bingo: number;
  assassin: number;
  total: number;
  // The game a pending bingo submission belongs to, so a notification can link straight to that
  // game's setup panel instead of the generic /admin page.
  bingoGameId: string | null;
};

// Aggregates everything an admin/owner might otherwise only notice by opening each game's own
// setup panel: submitted challenge proofs, pending bingo submissions, and contested eliminations.
export async function getPendingApprovalsCount(groupId: string): Promise<PendingApprovals> {
  const db = getFirebaseFirestore();
  const [challengesSnapshot, bingoSnapshot, assassinSnapshot] = await Promise.all([
    getDocs(query(collection(db, "challenges"), where("groupId", "==", groupId), where("status", "==", "submitted"))),
    getDocs(query(collection(db, "bingoSubmissions"), where("groupId", "==", groupId), where("status", "==", "pending"))),
    getDocs(query(collection(db, "assassinEliminations"), where("groupId", "==", groupId), where("status", "==", "contested")))
  ]);

  const challenges = challengesSnapshot.size;
  const bingo = bingoSnapshot.size;
  const assassin = assassinSnapshot.size;
  const bingoGameId = (bingoSnapshot.docs[0]?.data() as { gameId?: string } | undefined)?.gameId ?? null;
  return { challenges, bingo, assassin, total: challenges + bingo + assassin, bingoGameId };
}
