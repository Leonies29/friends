import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { AWARD_CATEGORIES } from "@/lib/game-data";
import type { AwardCategory, AwardVote } from "@/types/game";

const AWARD_CATEGORIES_COLLECTION = "awardCategories";
const VOTES = "votes";

export async function ensureAwardCategories(groupId: string) {
  const db = getFirebaseFirestore();
  const existing = await getDocs(query(collection(db, AWARD_CATEGORIES_COLLECTION), where("groupId", "==", groupId)));
  if (existing.size) {
    return existing.docs.map((item) => ({ id: item.id, ...item.data() }) as AwardCategory & { groupId: string });
  }

  await Promise.all(AWARD_CATEGORIES.map((category) =>
    setDoc(doc(db, AWARD_CATEGORIES_COLLECTION, `${groupId}_${category.id}`), {
      ...category,
      groupId,
      createdAt: serverTimestamp()
    })
  ));

  return AWARD_CATEGORIES;
}

export async function listVotes(groupId: string, voterId?: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, VOTES), where("groupId", "==", groupId)));
  const votes = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AwardVote);
  return voterId ? votes.filter((vote) => vote.voterId === voterId) : votes;
}

export async function castVote(input: {
  groupId: string;
  awardId: string;
  voterId: string;
  targetUserId: string | null;
  isWhiteVote: boolean;
}) {
  const db = getFirebaseFirestore();
  const voteId = `${input.groupId}_${input.awardId}_${input.voterId}`;
  await setDoc(doc(db, VOTES, voteId), {
    groupId: input.groupId,
    awardId: input.awardId,
    voterId: input.voterId,
    targetUserId: input.targetUserId,
    isWhiteVote: input.isWhiteVote,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });
}

export async function getAwardResults(groupId: string) {
  const votes = await listVotes(groupId);
  const results = new Map<string, Map<string, number>>();

  votes.forEach((vote) => {
    if (vote.isWhiteVote || !vote.targetUserId) return;
    const awardVotes = results.get(vote.awardId) ?? new Map<string, number>();
    awardVotes.set(vote.targetUserId, (awardVotes.get(vote.targetUserId) ?? 0) + 1);
    results.set(vote.awardId, awardVotes);
  });

  const ranked = new Map<string, Array<{ userId: string; count: number }>>();
  results.forEach((awardVotes, awardId) => {
    ranked.set(
      awardId,
      [...awardVotes.entries()]
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
    );
  });

  return ranked;
}

export async function countUserVotes(voterId: string, groupId: string) {
  const votes = await listVotes(groupId, voterId);
  return {
    voted: votes.filter((vote) => !vote.isWhiteVote && vote.targetUserId).length,
    white: votes.filter((vote) => vote.isWhiteVote).length,
    total: AWARD_CATEGORIES.length
  };
}
