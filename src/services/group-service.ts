import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { Group, GroupMember, GroupRole, ParticipantSlot } from "@/types";

export const GROUPS_COLLECTION = "friendGroups";
export const GROUPS_SCHEMA_COLLECTION = "groups";
export const GROUP_MEMBERS_COLLECTION = "groupMembers";

export type CreateGroupPayload = {
  name: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  vibe?: string;
  gameModes?: string[];
  participantNicknames: string[];
  ownerId?: string | null;
};

export type ClaimParticipantPayload = {
  groupId: string;
  userId: string;
  nickname: string;
  email?: string | null;
  avatarUrl?: string | null;
  role?: GroupRole;
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quest-group";
}

function uniqueCodePart() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function buildInviteCode(groupName: string) {
  const base = groupName.trim().replace(/[^a-z0-9]+/gi, "").slice(0, 6).toUpperCase() || "QUEST";
  return `${base}-${uniqueCodePart()}`;
}

export function buildParticipantSlots(nicknames: string[]): ParticipantSlot[] {
  const seen = new Set<string>();
  return nicknames
    .map((nickname) => nickname.trim())
    .filter(Boolean)
    .filter((nickname) => {
      const key = nickname.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((nickname, index) => ({
      id: `${slugify(nickname)}-${index + 1}`,
      nickname,
      claimedBy: null
    }));
}

export function getCreatorNickname(group: Pick<Group, "creatorNickname" | "plannedMembers">) {
  return group.creatorNickname?.trim() || group.plannedMembers?.[0]?.nickname?.trim() || "";
}

export function isCreatorNickname(
  group: Pick<Group, "creatorNickname" | "plannedMembers">,
  nickname?: string | null
) {
  const creatorNickname = getCreatorNickname(group);
  if (!creatorNickname || !nickname?.trim()) return false;
  return nickname.trim().toLowerCase() === creatorNickname.toLowerCase();
}

export function resolveJoinRole(
  group: Pick<Group, "createdBy" | "ownerId" | "creatorNickname" | "plannedMembers">,
  userId: string,
  nickname?: string | null
): GroupRole {
  if (group.createdBy === userId || group.ownerId === userId) return "OWNER";
  if (isCreatorNickname(group, nickname)) return "OWNER";
  return "PLAYER";
}

export function buildOwnerPatch(
  group: Pick<Group, "createdBy" | "ownerId">,
  userId: string,
  role: GroupRole
) {
  if (role !== "OWNER") return {};
  return {
    createdBy: group.createdBy || userId,
    ownerId: group.ownerId || userId
  };
}

export async function getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
  const db = getFirebaseFirestore();
  const normalized = inviteCode.trim().toUpperCase();
  const legacySnapshot = await getDocs(query(collection(db, GROUPS_COLLECTION), where("inviteCode", "==", normalized)));
  const legacyGroup = legacySnapshot.docs[0];

  if (legacyGroup) {
    return { id: legacyGroup.id, ...legacyGroup.data() } as Group;
  }

  const schemaSnapshot = await getDocs(query(collection(db, GROUPS_SCHEMA_COLLECTION), where("inviteCode", "==", normalized)));
  const schemaGroup = schemaSnapshot.docs[0];
  return schemaGroup ? ({ id: schemaGroup.id, ...schemaGroup.data() } as Group) : null;
}

export async function findGroupIdByInviteCode(inviteCode: string) {
  return (await getGroupByInviteCode(inviteCode))?.id ?? null;
}

export async function createGroup(payload: CreateGroupPayload) {
  const db = getFirebaseFirestore();
  let inviteCode = buildInviteCode(payload.name);
  let attempts = 0;

  while (attempts < 5 && await findGroupIdByInviteCode(inviteCode)) {
    inviteCode = buildInviteCode(payload.name);
    attempts += 1;
  }

  const id = `${slugify(payload.name)}-${inviteCode.split("-").at(-1)?.toLowerCase()}`;
  const participantSlots = buildParticipantSlots(payload.participantNicknames);
  const creatorNickname = participantSlots[0]?.nickname ?? "";
  const dates = [payload.startDate, payload.endDate].filter(Boolean).join(" to ") || "Custom dates";
  const group: Omit<Group, "createdAt" | "updatedAt"> = {
    id,
    name: payload.name.trim() || "Untitled Trip",
    inviteCode,
    description: payload.description || `Private travel game for ${payload.destination.trim() || "your trip"}.`,
    destination: payload.destination.trim(),
    dates,
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdBy: payload.ownerId ?? null,
    ownerId: payload.ownerId ?? null,
    creatorNickname,
    status: "setup",
    memberIds: payload.ownerId ? [payload.ownerId] : [],
    plannedMembers: participantSlots,
    gameIds: [],
    gameModes: payload.gameModes ?? [],
    gameStarted: false,
    currentDay: 0,
    vibe: payload.vibe ?? ""
  };

  const data = {
    ...group,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await Promise.all([
    setDoc(doc(db, GROUPS_COLLECTION, id), data),
    setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, id), data, { merge: true }),
    setDoc(doc(db, "appConfig", id), {
      activeGroupId: id,
      name: group.name,
      destination: group.destination,
      inviteCode,
      currentDay: 0,
      totalDays: 7,
      gameStarted: false,
      status: "setup",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true })
  ]);

  if (payload.ownerId) {
    await upsertGroupMember({
      groupId: id,
      userId: payload.ownerId,
      role: "OWNER",
      nickname: participantSlots[0]?.nickname ?? "Trip owner",
      status: "active"
    });
  }

  return group;
}

export async function ensureGroupOwnership(groupId: string, userId: string) {
  const db = getFirebaseFirestore();
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  const schemaGroupRef = doc(db, GROUPS_SCHEMA_COLLECTION, groupId);
  const groupSnapshot = await getDoc(groupRef);
  if (!groupSnapshot.exists()) return;

  const groupData = groupSnapshot.data() as Group;
  const member = await getCurrentGroupMember(groupId, userId);
  const creatorNickname = getCreatorNickname(groupData);
  const creatorSlot = groupData.plannedMembers?.[0];
  const isListedOwner = groupData.ownerId === userId || groupData.createdBy === userId;
  const isCreatorByNickname = Boolean(member?.nickname && isCreatorNickname(groupData, member.nickname));
  const isCreatorBySlot = creatorSlot?.claimedBy === userId;
  const shouldOwn = isListedOwner || isCreatorByNickname || isCreatorBySlot;

  if (!shouldOwn) return;

  const shouldFixOwner = isCreatorByNickname || isCreatorBySlot;
  const patch = {
    createdBy: shouldFixOwner ? userId : (groupData.createdBy || userId),
    ownerId: shouldFixOwner ? userId : (groupData.ownerId || userId),
    ...(creatorNickname && !groupData.creatorNickname ? { creatorNickname } : {}),
    updatedAt: serverTimestamp()
  };

  const memberSnapshot = await getDocs(query(collection(db, GROUP_MEMBERS_COLLECTION), where("groupId", "==", groupId)));
  const demoteWrongOwners = memberSnapshot.docs
    .filter((item) => item.data().role === "OWNER" && item.data().userId !== userId)
    .map((item) => upsertGroupMember({
      groupId,
      userId: String(item.data().userId ?? ""),
      role: "PLAYER",
      nickname: String(item.data().nickname ?? "Group member"),
      status: (item.data().status as GroupMember["status"]) ?? "active",
      email: String(item.data().email ?? ""),
      avatarUrl: (item.data().avatarUrl as string | null | undefined) ?? ""
    }));

  await Promise.all([
    setDoc(groupRef, patch, { merge: true }),
    setDoc(schemaGroupRef, patch, { merge: true }),
    upsertGroupMember({
      groupId,
      userId,
      role: "OWNER",
      nickname: member?.nickname ?? creatorNickname ?? "Trip owner",
      status: "active",
      email: member?.email ?? "",
      avatarUrl: member?.avatarUrl ?? ""
    }),
    ...demoteWrongOwners
  ]);
}

export async function upsertGroupMember(member: Pick<GroupMember, "groupId" | "userId" | "role" | "nickname" | "status"> & Partial<GroupMember>) {
  const db = getFirebaseFirestore();
  const memberId = `${member.groupId}_${member.userId}`;
  const payload = {
    groupId: member.groupId,
    userId: member.userId,
    role: member.role,
    nickname: member.nickname,
    status: member.status,
    id: memberId,
    email: member.email ?? "",
    avatarUrl: member.avatarUrl ?? "",
    participantSlotId: member.participantSlotId ?? null,
    joinedAt: member.joinedAt ?? serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, GROUP_MEMBERS_COLLECTION, memberId), payload, { merge: true });
}

export async function getCurrentGroupMember(groupId: string, userId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, GROUP_MEMBERS_COLLECTION, `${groupId}_${userId}`));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as GroupMember) : null;
}

export async function listGroupMembers(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, GROUP_MEMBERS_COLLECTION), where("groupId", "==", groupId), where("status", "==", "active")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as GroupMember);
}

export async function listAllGroupMembers(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, GROUP_MEMBERS_COLLECTION), where("groupId", "==", groupId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as GroupMember)
    .filter((member) => member.status !== "removed");
}

function slugifyNickname(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest";
}

export async function addPlannedMemberSlot(groupId: string, nickname: string) {
  const db = getFirebaseFirestore();
  const normalized = nickname.trim();
  if (!normalized) throw new Error("Nickname is required.");

  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  const groupSnapshot = await getDoc(groupRef);
  if (!groupSnapshot.exists()) throw new Error("This group no longer exists.");

  const groupData = groupSnapshot.data() as Group;
  const plannedMembers = Array.isArray(groupData.plannedMembers) ? [...groupData.plannedMembers] : [];
  if (plannedMembers.some((member) => member.nickname.toLowerCase() === normalized.toLowerCase())) {
    throw new Error("This nickname is already planned for the trip.");
  }

  const nextMembers = [
    ...plannedMembers,
    {
      id: `${slugifyNickname(normalized)}-${plannedMembers.length + 1}`,
      nickname: normalized,
      claimedBy: null
    }
  ];

  const patch = { plannedMembers: nextMembers, updatedAt: serverTimestamp() };
  await Promise.all([
    updateDoc(groupRef, patch),
    setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId), patch, { merge: true })
  ]);
}

export async function removePlannedMemberSlot(groupId: string, slotId: string) {
  const db = getFirebaseFirestore();
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  const groupSnapshot = await getDoc(groupRef);
  if (!groupSnapshot.exists()) throw new Error("This group no longer exists.");

  const groupData = groupSnapshot.data() as Group;
  const plannedMembers = Array.isArray(groupData.plannedMembers) ? groupData.plannedMembers : [];
  const slot = plannedMembers.find((member) => member.id === slotId);
  if (!slot) throw new Error("Participant slot not found.");
  if (slot.claimedBy) throw new Error("This participant already joined. Deactivate them instead.");

  const nextMembers = plannedMembers.filter((member) => member.id !== slotId);
  const patch = { plannedMembers: nextMembers, updatedAt: serverTimestamp() };
  await Promise.all([
    updateDoc(groupRef, patch),
    setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId), patch, { merge: true })
  ]);
}

export async function claimParticipant(payload: ClaimParticipantPayload) {
  const db = getFirebaseFirestore();
  const memberId = `${payload.groupId}_${payload.userId}`;

  await runTransaction(db, async (transaction) => {
    const groupRef = doc(db, GROUPS_COLLECTION, payload.groupId);
    const schemaGroupRef = doc(db, GROUPS_SCHEMA_COLLECTION, payload.groupId);
    const memberRef = doc(db, GROUP_MEMBERS_COLLECTION, memberId);
    const groupSnapshot = await transaction.get(groupRef);

    if (!groupSnapshot.exists()) {
      throw new Error("This group no longer exists.");
    }

    const groupData = groupSnapshot.data() as Group;
    const plannedMembers = Array.isArray(groupData.plannedMembers) ? groupData.plannedMembers : [];
    const slot = plannedMembers.find((member) => member.nickname.toLowerCase() === payload.nickname.trim().toLowerCase());

    if (!slot) {
      throw new Error("This participant is not available in the trip.");
    }

    if (slot.claimedBy && slot.claimedBy !== payload.userId) {
      throw new Error("This participant has already been linked to another account.");
    }

    const claimedAt = new Date().toISOString();
    const nextMembers = plannedMembers.map((member) =>
      member.id === slot.id
        ? { ...member, claimedBy: payload.userId, claimedAt }
        : member
    );
    const isCreator = isCreatorNickname(groupData, payload.nickname);
    const role = payload.role ?? (isCreator ? "OWNER" : "PLAYER");
    const ownerPatch = buildOwnerPatch(groupData, payload.userId, role);

    transaction.set(groupRef, {
      plannedMembers: nextMembers,
      memberIds: arrayUnion(payload.userId),
      ...ownerPatch,
      updatedAt: serverTimestamp()
    }, { merge: true });
    transaction.set(schemaGroupRef, {
      plannedMembers: nextMembers,
      memberIds: arrayUnion(payload.userId),
      ...ownerPatch,
      updatedAt: serverTimestamp()
    }, { merge: true });
    transaction.set(memberRef, {
      id: memberId,
      groupId: payload.groupId,
      userId: payload.userId,
      role,
      nickname: slot.nickname,
      email: payload.email ?? "",
      avatarUrl: payload.avatarUrl ?? "",
      participantSlotId: slot.id,
      status: "active",
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  await updateDoc(doc(db, "users", payload.userId), {
    groupIds: arrayUnion(payload.groupId),
    activeGroupId: payload.groupId,
    username: payload.nickname,
    updatedAt: serverTimestamp()
  });
}

export async function setActiveGroupForUser(userId: string, groupId: string) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, "users", userId), {
    activeGroupId: groupId,
    updatedAt: serverTimestamp()
  });
}

async function loadUserGroupIds(userId: string) {
  const db = getFirebaseFirestore();
  const userSnapshot = await getDoc(doc(db, "users", userId));
  const userData = userSnapshot.exists() ? userSnapshot.data() : {};
  const groupIdsFromUser = Array.isArray(userData.groupIds) ? (userData.groupIds as string[]) : [];
  const archivedGroupIds = Array.isArray(userData.archivedGroupIds) ? (userData.archivedGroupIds as string[]) : [];

  const membersSnapshot = await getDocs(
    query(collection(db, GROUP_MEMBERS_COLLECTION), where("userId", "==", userId), where("status", "==", "active"))
  );
  const groupIdsFromMembers = membersSnapshot.docs.map((item) => String(item.data().groupId ?? ""));

  const uniqueGroupIds = [...new Set([...groupIdsFromUser, ...groupIdsFromMembers].filter(Boolean))];
  return { uniqueGroupIds, archivedGroupIds };
}

async function loadGroupsByIds(groupIds: string[]) {
  const db = getFirebaseFirestore();
  const groups = await Promise.all(
    groupIds.map(async (groupId) => {
      const snapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Group) : null;
    })
  );

  return groups
    .filter((group): group is Group => Boolean(group))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

export async function listUserMembershipGroups(userId: string) {
  const { uniqueGroupIds, archivedGroupIds } = await loadUserGroupIds(userId);
  const archivedSet = new Set(archivedGroupIds);
  const visibleGroupIds = uniqueGroupIds.filter((groupId) => !archivedSet.has(groupId));
  return loadGroupsByIds(visibleGroupIds);
}

export async function listArchivedUserGroups(userId: string) {
  const { uniqueGroupIds, archivedGroupIds } = await loadUserGroupIds(userId);
  const archivedSet = new Set(archivedGroupIds);
  const archivedGroupIdList = uniqueGroupIds.filter((groupId) => archivedSet.has(groupId));
  return loadGroupsByIds(archivedGroupIdList);
}

export async function archiveUserGroup(userId: string, groupId: string) {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", userId);
  const userSnapshot = await getDoc(userRef);
  const activeGroupId = userSnapshot.exists() ? (userSnapshot.data().activeGroupId as string | undefined) : undefined;

  await updateDoc(userRef, {
    archivedGroupIds: arrayUnion(groupId),
    ...(activeGroupId === groupId ? { activeGroupId: null } : {}),
    updatedAt: serverTimestamp()
  });
}

export async function restoreUserGroup(userId: string, groupId: string) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, "users", userId), {
    archivedGroupIds: arrayRemove(groupId),
    updatedAt: serverTimestamp()
  });
}

export async function activateGroupForUser(userId: string, groupId: string) {
  const db = getFirebaseFirestore();
  const [member, userSnapshot, groupSnapshot] = await Promise.all([
    getCurrentGroupMember(groupId, userId),
    getDoc(doc(db, "users", userId)),
    getDoc(doc(db, GROUPS_COLLECTION, groupId))
  ]);

  if (!groupSnapshot.exists()) {
    throw new Error("This group no longer exists.");
  }

  const groupData = groupSnapshot.data() as Group;
  const groupIds = Array.isArray(userSnapshot.data()?.groupIds) ? (userSnapshot.data()?.groupIds as string[]) : [];
  const isMember = member?.status === "active"
    || groupData.memberIds?.includes(userId)
    || groupIds.includes(groupId);

  if (!isMember) {
    throw new Error("You are not a member of this group.");
  }

  await setActiveGroupForUser(userId, groupId);
  return { ...groupData, id: groupSnapshot.id } as Group;
}
