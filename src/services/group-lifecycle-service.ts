import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { ensureAwardCategories } from "@/services/award-service";
import { ensureDefaultGames } from "@/services/game-service";
import {
  getCurrentGroupMember,
  GROUP_MEMBERS_COLLECTION,
  GROUPS_COLLECTION,
  GROUPS_SCHEMA_COLLECTION
} from "@/services/group-service";
import { canDeleteGroup, canManageGames, resolveEffectiveRole } from "@/services/permissions";
import type { Group } from "@/types";

const GROUP_SCOPED_COLLECTIONS = [
  "games",
  "gameSessions",
  "challenges",
  "photos",
  "photoReactions",
  "photoComments",
  "xpTransactions",
  "leaderboards",
  "scheduleEvents",
  "votes",
  "awardCategories",
  "quests",
  "questCompletions",
  "questRelics",
  "notifications",
  "badges",
  "activityFeed",
  "bingoChallenges",
  "bingoSessions",
  "bingoCards",
  "bingoSubmissions",
  "bingoPlayers",
  "bingoLeaderboard",
  "quizQuestions",
  "quizSessions",
  "quizAnswers",
  "quizLeaderboard",
  "assassinGames",
  "assassinPlayers",
  "assassinMissions",
  "assassinEliminations",
  "assassinMissionTemplates"
] as const;

async function deleteQueryBatch(collectionName: string, groupId: string) {
  const db = getFirebaseFirestore();

  while (true) {
    const snapshot = await getDocs(
      query(collection(db, collectionName), where("groupId", "==", groupId), limit(400))
    );
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
}

async function deleteGroupMembers(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, GROUP_MEMBERS_COLLECTION), where("groupId", "==", groupId)));

  if (!snapshot.empty) {
    const batch = writeBatch(db);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
}

async function deleteAssassinSetup(groupId: string) {
  const db = getFirebaseFirestore();
  const setupRef = doc(db, "assassinSetups", groupId);
  const snapshot = await getDoc(setupRef);
  if (snapshot.exists()) {
    await deleteDoc(setupRef);
  }
}

async function wipeGroupGameData(groupId: string) {
  await Promise.all(GROUP_SCOPED_COLLECTIONS.map((collectionName) => deleteQueryBatch(collectionName, groupId)));
  await deleteAssassinSetup(groupId);
}

async function resetGroupProgressFields(groupId: string) {
  const db = getFirebaseFirestore();
  const progressPatch = {
    gameStarted: false,
    currentDay: 0,
    status: "setup",
    updatedAt: serverTimestamp()
  };

  await Promise.all([
    updateDoc(doc(db, GROUPS_COLLECTION, groupId), progressPatch),
    updateDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId), progressPatch),
    updateDoc(doc(db, "appConfig", groupId), {
      gameStarted: false,
      currentDay: 0,
      status: "setup",
      updatedAt: serverTimestamp()
    })
  ]);
}

async function assertCanManageGroupGames(groupId: string, userId: string) {
  const [groupSnapshot, member] = await Promise.all([
    getDoc(doc(getFirebaseFirestore(), GROUPS_COLLECTION, groupId)),
    getCurrentGroupMember(groupId, userId)
  ]);

  if (!groupSnapshot.exists()) {
    throw new Error("This group no longer exists.");
  }

  const group = { id: groupSnapshot.id, ...groupSnapshot.data() } as Group;
  const role = resolveEffectiveRole(member, group, userId);
  if (!canManageGames(role)) {
    throw new Error("Only group owners and admins can reset group progress.");
  }

  return group;
}

async function assertCanDeleteGroup(groupId: string, userId: string) {
  const [groupSnapshot, member] = await Promise.all([
    getDoc(doc(getFirebaseFirestore(), GROUPS_COLLECTION, groupId)),
    getCurrentGroupMember(groupId, userId)
  ]);

  if (!groupSnapshot.exists()) {
    throw new Error("This group no longer exists.");
  }

  const group = { id: groupSnapshot.id, ...groupSnapshot.data() } as Group;
  const role = resolveEffectiveRole(member, group, userId);
  if (!canDeleteGroup(role)) {
    throw new Error("Only the trip owner can delete this group.");
  }

  return group;
}

async function detachUsersFromGroup(groupId: string, memberUserIds: string[]) {
  const db = getFirebaseFirestore();
  const uniqueUserIds = [...new Set(memberUserIds.filter(Boolean))];

  await Promise.allSettled(uniqueUserIds.map(async (targetUserId) => {
    const userRef = doc(db, "users", targetUserId);
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) return;

    const activeGroupId = userSnapshot.data().activeGroupId as string | undefined;
    await updateDoc(userRef, {
      groupIds: arrayRemove(groupId),
      archivedGroupIds: arrayRemove(groupId),
      ...(activeGroupId === groupId ? { activeGroupId: null } : {}),
      updatedAt: serverTimestamp()
    });
  }));
}

export async function resetGroupProgress(groupId: string, userId: string) {
  await assertCanManageGroupGames(groupId, userId);
  await wipeGroupGameData(groupId);
  await resetGroupProgressFields(groupId);
  await Promise.all([ensureDefaultGames(groupId), ensureAwardCategories(groupId)]);
}

export async function deleteGroupPermanently(groupId: string, userId: string) {
  const group = await assertCanDeleteGroup(groupId, userId);
  const db = getFirebaseFirestore();

  const membersSnapshot = await getDocs(query(collection(db, GROUP_MEMBERS_COLLECTION), where("groupId", "==", groupId)));
  const memberUserIds = [
    ...(group.memberIds ?? []),
    ...membersSnapshot.docs.map((item) => String(item.data().userId ?? ""))
  ];

  await wipeGroupGameData(groupId);
  await deleteGroupMembers(groupId);

  await Promise.all([
    deleteDoc(doc(db, GROUPS_COLLECTION, groupId)),
    deleteDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId)),
    deleteDoc(doc(db, "appConfig", groupId))
  ]);

  await detachUsersFromGroup(groupId, memberUserIds);
}
