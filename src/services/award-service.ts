import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { AWARD_CATEGORIES } from "@/lib/game-data";
import type { AwardCategory, AwardCeremonyDoc, AwardVote } from "@/types/game";

const AWARD_CATEGORIES_COLLECTION = "awardCategories";
const VOTES = "votes";
const AWARD_CEREMONY_COLLECTION = "awardCeremony";

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
  const revealedCategoryIds = new Set(categories.filter((category) => category.resultsRevealed).map((category) => category.id));

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

// Pure read — never auto-seeds. Seeding writes require canManageGroup (see firestore.rules), so
// triggering it from a plain read that any group member can hit (award page, ceremony page, the
// dashboard "awards won" stat) crashes every non-admin with a permission error the moment
// categories happen to be empty. Seeding only ever happens from an explicitly admin-gated call
// site (ensureAwardCategories, called from the admin dashboard and group reset).
export async function listAwardCategories(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, AWARD_CATEGORIES_COLLECTION), where("groupId", "==", groupId)));
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

export async function deleteAwardCategory(categoryId: string) {
  const db = getFirebaseFirestore();
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, AWARD_CATEGORIES_COLLECTION, categoryId));
}

export async function updateAwardCategoryResultsRevealed(categoryId: string, revealed: boolean) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, AWARD_CATEGORIES_COLLECTION, categoryId), { resultsRevealed: revealed, updatedAt: serverTimestamp() }, { merge: true });
}

// Ceremony state is one doc per group (id == groupId) so every viewer can subscribe to the same
// live reveal — the admin's "next category" click is what advances everyone's screen in sync.
export async function getAwardCeremony(groupId: string): Promise<AwardCeremonyDoc | null> {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, AWARD_CEREMONY_COLLECTION, groupId));
  return snapshot.exists() ? (snapshot.data() as AwardCeremonyDoc) : null;
}

export function subscribeAwardCeremony(groupId: string, onChange: (ceremony: AwardCeremonyDoc | null) => void) {
  const db = getFirebaseFirestore();
  return onSnapshot(doc(db, AWARD_CEREMONY_COLLECTION, groupId), (snapshot) => {
    onChange(snapshot.exists() ? (snapshot.data() as AwardCeremonyDoc) : null);
  });
}

export async function startAwardCeremony(groupId: string, orderedCategoryIds: string[]) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, AWARD_CEREMONY_COLLECTION, groupId), {
    groupId,
    status: "active",
    step: 0,
    phase: "suspense",
    orderedCategoryIds,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function revealAwardCeremonyWinner(groupId: string, categoryId: string) {
  const db = getFirebaseFirestore();
  await Promise.all([
    setDoc(doc(db, AWARD_CEREMONY_COLLECTION, groupId), { phase: "revealed", updatedAt: serverTimestamp() }, { merge: true }),
    updateAwardCategoryResultsRevealed(categoryId, true)
  ]);
}

export async function advanceAwardCeremony(groupId: string, nextStep: number, isLast: boolean) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, AWARD_CEREMONY_COLLECTION, groupId), isLast
    ? { status: "complete", phase: "revealed", updatedAt: serverTimestamp() }
    : { status: "active", step: nextStep, phase: "suspense", updatedAt: serverTimestamp() },
  { merge: true });
}

// Once a ceremony reaches "complete" there was previously no way back — every future visit to
// the Ceremony tab landed straight on the static "all winners" recap instead of the category-by-
// category reveal animation, which is what admins actually want when replaying it (e.g. after
// testing it once before the real trip finale). This puts the ceremony back to its pre-launch
// state so "Launch the ceremony" starts a fresh, fully animated run-through.
export async function resetAwardCeremony(groupId: string) {
  const db = getFirebaseFirestore();
  const categories = await listAwardCategories(groupId);
  await Promise.all([
    setDoc(doc(db, AWARD_CEREMONY_COLLECTION, groupId), {
      groupId,
      status: "idle",
      step: 0,
      phase: "suspense",
      orderedCategoryIds: [],
      updatedAt: serverTimestamp()
    }),
    ...categories.map((category) => updateAwardCategoryResultsRevealed(category.id, false))
  ]);
}
