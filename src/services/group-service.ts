import {
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

export function resolveJoinRole(
  group: Pick<Group, "createdBy" | "ownerId">,
  userId: string
): GroupRole {
  if (!group.createdBy && !group.ownerId) return "OWNER";
  if (group.createdBy === userId || group.ownerId === userId) return "OWNER";
  return "PLAYER";
}

export async function ensureGroupOwnership(groupId: string, userId: string) {
  const db = getFirebaseFirestore();
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  const schemaGroupRef = doc(db, GROUPS_SCHEMA_COLLECTION, groupId);
  const groupSnapshot = await getDoc(groupRef);
  if (!groupSnapshot.exists()) return;

  const groupData = groupSnapshot.data() as Group;
  const member = await getCurrentGroupMember(groupId, userId);
  const isListedOwner = groupData.ownerId === userId || groupData.createdBy === userId;
  const isSoleMember = (groupData.memberIds?.length ?? 0) === 1 && groupData.memberIds?.[0] === userId;
  const shouldOwn = isListedOwner || ((!groupData.ownerId && !groupData.createdBy) && (isSoleMember || Boolean(member)));

  if (!shouldOwn) return;

  const patch = {
    createdBy: groupData.createdBy || userId,
    ownerId: groupData.ownerId || userId,
    updatedAt: serverTimestamp()
  };

  await Promise.all([
    setDoc(groupRef, patch, { merge: true }),
    setDoc(schemaGroupRef, patch, { merge: true }),
    member
      ? upsertGroupMember({
          groupId,
          userId,
          role: "OWNER",
          nickname: member.nickname,
          status: "active",
          email: member.email ?? "",
          avatarUrl: member.avatarUrl ?? ""
        })
      : Promise.resolve()
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
    const isOwner = !groupData.createdBy || groupData.createdBy === payload.userId;
    const role = payload.role ?? (isOwner ? "OWNER" : "PLAYER");

    transaction.set(groupRef, {
      plannedMembers: nextMembers,
      memberIds: arrayUnion(payload.userId),
      createdBy: groupData.createdBy || payload.userId,
      ownerId: groupData.ownerId || payload.userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
    transaction.set(schemaGroupRef, {
      plannedMembers: nextMembers,
      memberIds: arrayUnion(payload.userId),
      createdBy: groupData.createdBy || payload.userId,
      ownerId: groupData.ownerId || payload.userId,
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

export async function listUserMembershipGroups(userId: string) {
  const db = getFirebaseFirestore();
  const userSnapshot = await getDoc(doc(db, "users", userId));
  const userData = userSnapshot.exists() ? userSnapshot.data() : {};
  const groupIdsFromUser = Array.isArray(userData.groupIds) ? (userData.groupIds as string[]) : [];

  const membersSnapshot = await getDocs(
    query(collection(db, GROUP_MEMBERS_COLLECTION), where("userId", "==", userId), where("status", "==", "active"))
  );
  const groupIdsFromMembers = membersSnapshot.docs.map((item) => String(item.data().groupId ?? ""));

  const uniqueGroupIds = [...new Set([...groupIdsFromUser, ...groupIdsFromMembers].filter(Boolean))];
  const groups = await Promise.all(
    uniqueGroupIds.map(async (groupId) => {
      const snapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Group) : null;
    })
  );

  return groups
    .filter((group): group is Group => Boolean(group))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
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
