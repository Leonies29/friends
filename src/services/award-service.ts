import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
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

export async function countAwardsWonByUser(groupId: string, userId: string) {
  const [results, categories] = await Promise.all([
    getAwardResults(groupId),
    listAwardCategories(groupId)
  ]);
  const revealedCategoryIds = new Set(categories.filter((category) => category.visible).map((category) => category.id));

  let won = 0;
  results.forEach((ranked, awardId) => {
    if (!revealedCategoryIds.has(awardId) || !ranked.length) return;
    const topCount = ranked[0].count;
    if (topCount > 0 && ranked.some((entry) => entry.userId === userId && entry.count === topCount)) {
      won += 1;
    }
  });
  return won;
}

export async function countUserVotes(voterId: string, groupId: string) {
  const votes = await listVotes(groupId, voterId);
  const categories = await listAwardCategories(groupId);
  return {
    voted: votes.filter((vote) => !vote.isWhiteVote && vote.targetUserId).length,
    white: votes.filter((vote) => vote.isWhiteVote).length,
    total: categories.length
  };
}

export async function listAwardCategories(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, AWARD_CATEGORIES_COLLECTION), where("groupId", "==", groupId)));
  if (!snapshot.size) return ensureAwardCategories(groupId);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AwardCategory & { groupId: string });
}

export async function createAwardCategory(groupId: string, input: { emoji: string; title: string; description: string }) {
  const db = getFirebaseFirestore();
  const id = `${groupId}_${Date.now()}`;
  await setDoc(doc(db, AWARD_CATEGORIES_COLLECTION, id), {
    id,
    groupId,
    emoji: input.emoji,
    title: input.title,
    description: input.description,
    createdAt: serverTimestamp()
  });
  return id;
}

export async function updateAwardCategory(categoryId: string, data: Partial<Pick<AwardCategory, "emoji" | "title" | "description">>) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, AWARD_CATEGORIES_COLLECTION, categoryId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getVoteParticipationStats(groupId: string, memberIds: string[]) {
  const [votes, categories] = await Promise.all([
    listVotes(groupId),
    listAwardCategories(groupId)
  ]);

  const totalCategories = categories.length;
  const eligibleVoters = memberIds.filter(Boolean);
  const voterProgress = eligibleVoters.map((voterId) => {
    const voterVotes = votes.filter((vote) => vote.voterId === voterId);
    const completed = voterVotes.filter((vote) => vote.isWhiteVote || vote.targetUserId).length;
    return {
      voterId,
      completed,
      total: totalCategories,
      isComplete: completed >= totalCategories
    };
  });

  const completedVoters = voterProgress.filter((entry) => entry.isComplete).length;
  const participationRate = eligibleVoters.length
    ? Math.round((completedVoters / eligibleVoters.length) * 100)
    : 0;

  return {
    totalCategories,
    eligibleVoters: eligibleVoters.length,
    completedVoters,
    participationRate,
    voterProgress,
    pendingVoterIds: voterProgress.filter((entry) => !entry.isComplete).map((entry) => entry.voterId)
  };
}

export async function updateAwardCategoryVisibility(categoryId: string, visible: boolean) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, AWARD_CATEGORIES_COLLECTION, categoryId), { visible, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteAwardCategory(categoryId: string) {
  const db = getFirebaseFirestore();
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, AWARD_CATEGORIES_COLLECTION, categoryId));
}
