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
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { getFirebaseAuth } from "@/firebase/auth";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { ensureAwardCategories } from "@/services/award-service";
import { ensureDefaultGames } from "@/services/game-service";
import {
  forceSyncGroupAdminAccess,
  getCurrentGroupMember,
  GROUP_MEMBERS_COLLECTION,
  GROUPS_COLLECTION,
  GROUPS_SCHEMA_COLLECTION,
  prepareGroupAdminAccess
} from "@/services/group-service";
import { canDeleteGroup, resolveEffectiveRole } from "@/services/permissions";
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

async function runStep<T>(label: string, task: () => Promise<T>) {
  try {
    return await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (/insufficient permissions/i.test(message)) {
      throw new Error(`Access denied during "${label}". Sign in again with the group owner's account.`);
    }
    throw new Error(`${label}: ${message}`);
  }
}

async function deleteQueryBatch(collectionName: string, groupId: string) {
  const db = getFirebaseFirestore();

  while (true) {
    let snapshot;
    try {
      snapshot = await getDocs(
        query(collection(db, collectionName), where("groupId", "==", groupId), limit(400))
      );
    } catch {
      return;
    }

    if (snapshot.empty) return;

    const results = await Promise.allSettled(snapshot.docs.map((item) => deleteDoc(item.ref)));
    const deletedCount = results.filter((result) => result.status === "fulfilled").length;
    if (deletedCount === 0) return;
  }
}

async function deleteGroupMembers(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, GROUP_MEMBERS_COLLECTION), where("groupId", "==", groupId)));
  await Promise.allSettled(snapshot.docs.map((item) => deleteDoc(item.ref)));
}

async function deleteAssassinSetup(groupId: string) {
  const db = getFirebaseFirestore();
  const setupRef = doc(db, "assassinSetups", groupId);
  try {
    const snapshot = await getDoc(setupRef);
    if (snapshot.exists()) {
      await deleteDoc(setupRef);
    }
  } catch {
    // Best effort.
  }
}

async function wipeGroupGameData(groupId: string) {
  await Promise.allSettled([
    ...GROUP_SCOPED_COLLECTIONS.map((collectionName) => deleteQueryBatch(collectionName, groupId)),
    deleteAssassinSetup(groupId)
  ]);
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
    setDoc(doc(db, GROUPS_COLLECTION, groupId), progressPatch, { merge: true }),
    setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId), progressPatch, { merge: true }),
    setDoc(doc(db, "appConfig", groupId), {
      gameStarted: false,
      currentDay: 0,
      status: "setup",
      updatedAt: serverTimestamp()
    }, { merge: true })
  ]);
}

function resolveResetOptions(userId: string, options?: ResetGroupOptions): ResetGroupOptions {
  const authUser = getFirebaseAuth().currentUser;
  return {
    appRole: options?.appRole ?? "OWNER",
    nickname: options?.nickname,
    email: options?.email ?? authUser?.email ?? undefined
  };
}

async function assertCanDeleteGroup(groupId: string, userId: string, options?: ResetGroupOptions) {
  await prepareGroupAdminAccess(groupId, userId, resolveResetOptions(userId, options));

  const [groupSnapshot, member] = await Promise.all([
    getDoc(doc(getFirebaseFirestore(), GROUPS_COLLECTION, groupId)),
    getCurrentGroupMember(groupId, userId)
  ]);

  if (!groupSnapshot.exists()) {
    throw new Error("This group no longer exists.");
  }

  const group = { id: groupSnapshot.id, ...groupSnapshot.data() } as Group;
  const role = resolveEffectiveRole(member, group, userId, options?.email);
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

export type ResetGroupOptions = {
  appRole?: import("@/types").GroupRole;
  nickname?: string;
  email?: string;
};

export async function resetGroupProgress(groupId: string, userId: string, options?: ResetGroupOptions) {
  const resolved = resolveResetOptions(userId, options);

  await runStep("admin sync", () =>
    forceSyncGroupAdminAccess(groupId, userId, resolved)
  );
  await runStep("deleting game data", () => wipeGroupGameData(groupId));
  await runStep("resetting the group", () => resetGroupProgressFields(groupId));
  await Promise.allSettled([
    ensureDefaultGames(groupId),
    ensureAwardCategories(groupId)
  ]);
}

export async function deleteGroupPermanently(groupId: string, userId: string, options?: ResetGroupOptions) {
  const group = await assertCanDeleteGroup(groupId, userId, options);

  const membersSnapshot = await getDocs(query(collection(getFirebaseFirestore(), GROUP_MEMBERS_COLLECTION), where("groupId", "==", groupId)));
  const memberUserIds = [
    ...(group.memberIds ?? []),
    ...membersSnapshot.docs.map((item) => String(item.data().userId ?? ""))
  ];

  await wipeGroupGameData(groupId);
  await deleteGroupMembers(groupId);

  await Promise.all([
    deleteDoc(doc(getFirebaseFirestore(), GROUPS_COLLECTION, groupId)),
    deleteDoc(doc(getFirebaseFirestore(), GROUPS_SCHEMA_COLLECTION, groupId)),
    deleteDoc(doc(getFirebaseFirestore(), "appConfig", groupId))
  ]);

  await detachUsersFromGroup(groupId, memberUserIds);
}
