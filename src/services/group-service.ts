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
import { getFirebaseAuth } from "@/firebase/auth";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { canManageGames, resolveEffectiveRole } from "@/services/permissions";
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
  ownerEmail?: string | null;
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

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function getCreatorNickname(group: Pick<Group, "creatorNickname" | "plannedMembers">) {
  return group.creatorNickname?.trim() || group.plannedMembers?.[0]?.nickname?.trim() || "";
}

async function resolveMemberNickname(
  groupId: string,
  userId: string,
  options?: { explicit?: string | null; group?: Group; existingMember?: GroupMember | null }
) {
  const explicit = options?.explicit?.trim();
  if (explicit) return explicit;

  const member = options?.existingMember ?? await getCurrentGroupMember(groupId, userId);
  if (member?.nickname?.trim()) return member.nickname.trim();

  const db = getFirebaseFirestore();
  const userSnapshot = await getDoc(doc(db, "users", userId));
  if (userSnapshot.exists()) {
    const username = String(userSnapshot.data().username ?? "").trim();
    if (username) return username;
  }

  const groupSnapshot = options?.group
    ? null
    : await getDoc(doc(db, GROUPS_COLLECTION, groupId));
  const group = options?.group ?? (groupSnapshot?.exists()
    ? ({ id: groupSnapshot.id, ...groupSnapshot.data() } as Group)
    : undefined);
  const creatorNickname = group ? getCreatorNickname(group) : "";
  if (creatorNickname) return creatorNickname;

  return member?.nickname?.trim() || "Group member";
}

export function isGroupOwnerAccount(
  group: Pick<Group, "ownerId" | "createdBy" | "ownerEmail">,
  userId: string,
  email?: string | null
) {
  if (group.ownerId === userId || group.createdBy === userId) return true;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  return normalizeEmail(group.ownerEmail) === normalizedEmail;
}

export function resolveJoinRole(
  group: Pick<Group, "createdBy" | "ownerId" | "ownerEmail">,
  userId: string,
  email?: string | null
): GroupRole {
  if (isGroupOwnerAccount(group, userId, email)) return "OWNER";
  return "PLAYER";
}

export function buildOwnerPatch(
  group: Pick<Group, "createdBy" | "ownerId" | "ownerEmail">,
  userId: string,
  role: GroupRole,
  email?: string | null
) {
  if (role !== "OWNER") return {};
  return {
    createdBy: group.createdBy || userId,
    ownerId: group.ownerId || userId,
    ownerEmail: group.ownerEmail || normalizeEmail(email) || undefined
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
    ownerEmail: payload.ownerEmail ? normalizeEmail(payload.ownerEmail) : null,
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
      email: payload.ownerEmail ?? "",
      status: "active"
    });
  }

  return group;
}

export async function ensureGroupOwnership(groupId: string, userId: string, email?: string | null) {
  const db = getFirebaseFirestore();
  const groupRef = doc(db, GROUPS_COLLECTION, groupId);
  const schemaGroupRef = doc(db, GROUPS_SCHEMA_COLLECTION, groupId);
  const groupSnapshot = await getDoc(groupRef);
  if (!groupSnapshot.exists()) return;

  const groupData = groupSnapshot.data() as Group;

  // Ownership can only be *claimed* while the group has no owner yet (bootstrap right after an
  // anonymous group creation). Once an owner is on record, the only way to change it is the
  // explicit transferGroupOwnership flow — otherwise a stale ownerEmail match (or anyone else
  // who transiently satisfies isGroupOwnerAccount) would keep re-promoting themselves to OWNER
  // and silently demoting the real owner/admins on every reload.
  if (groupData.ownerId || groupData.createdBy) return;

  const member = await getCurrentGroupMember(groupId, userId);
  const creatorNickname = getCreatorNickname(groupData);
  const creatorSlot = groupData.plannedMembers?.[0];
  const resolvedEmail = normalizeEmail(email) || normalizeEmail(member?.email);
  const isListedOwner = isGroupOwnerAccount(groupData, userId, resolvedEmail);
  const isCreatorBySlot = creatorSlot?.claimedBy === userId;
  const shouldOwn = isListedOwner || isCreatorBySlot;

  if (!shouldOwn) return;

  const patch = {
    createdBy: userId,
    ownerId: userId,
    ownerEmail: resolvedEmail || groupData.ownerEmail || null,
    memberIds: arrayUnion(userId),
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

  await setDoc(groupRef, patch, { merge: true });
  await setDoc(schemaGroupRef, patch, { merge: true });
  await upsertGroupMember({
    groupId,
    userId,
    role: "OWNER",
    nickname: await resolveMemberNickname(groupId, userId, {
      group: groupData,
      existingMember: member
    }),
    status: "active",
    email: resolvedEmail || member?.email || "",
    avatarUrl: member?.avatarUrl ?? ""
  });
  await Promise.allSettled(demoteWrongOwners);
}

export async function ensureActiveGroupMembership(
  groupId: string,
  userId: string,
  options?: { nickname?: string; email?: string; avatarUrl?: string | null }
) {
  const db = getFirebaseFirestore();
  const [groupSnapshot, member] = await Promise.all([
    getDoc(doc(db, GROUPS_COLLECTION, groupId)),
    getCurrentGroupMember(groupId, userId)
  ]);

  if (!groupSnapshot.exists()) return null;

  const group = { id: groupSnapshot.id, ...groupSnapshot.data() } as Group;
  const isListedMember = group.memberIds?.includes(userId)
    || group.ownerId === userId
    || group.createdBy === userId;

  if (!isListedMember) return member;

  const effectiveRole = resolveEffectiveRole(member, group, userId, options?.email ?? member?.email);
  const targetRole: GroupRole = canManageGames(effectiveRole)
    ? (effectiveRole === "OWNER" ? "OWNER" : "ADMIN")
    : (member?.role ?? effectiveRole ?? "PLAYER");

  if (member?.status === "active" && member.role === targetRole) return member;

  await upsertGroupMember({
    groupId,
    userId,
    role: targetRole,
    nickname: await resolveMemberNickname(groupId, userId, {
      explicit: options?.nickname,
      group,
      existingMember: member
    }),
    email: options?.email ?? member?.email ?? "",
    avatarUrl: options?.avatarUrl ?? member?.avatarUrl ?? "",
    status: "active"
  });

  return getCurrentGroupMember(groupId, userId);
}

export async function forceSyncGroupAdminAccess(
  groupId: string,
  userId: string,
  options?: { nickname?: string; email?: string | null; appRole?: GroupRole }
) {
  const authUser = getFirebaseAuth().currentUser;
  const resolvedEmail = normalizeEmail(options?.email) || normalizeEmail(authUser?.email) || "";
  const db = getFirebaseFirestore();
  const [groupSnapshot, existingMember] = await Promise.all([
    getDoc(doc(db, GROUPS_COLLECTION, groupId)),
    getCurrentGroupMember(groupId, userId)
  ]);
  if (!groupSnapshot.exists()) {
    throw new Error("This group no longer exists.");
  }

  const group = { id: groupSnapshot.id, ...groupSnapshot.data() } as Group;
  const nickname = await resolveMemberNickname(groupId, userId, {
    explicit: options?.nickname,
    group,
    existingMember
  });

  // Only ever (re)claim ownerId/createdBy when the group has no owner yet, or this user already
  // is the owner. A plain ADMIN syncing their access must never overwrite the real owner's
  // identity on the group document — that field is not "whoever last touched the group".
  const groupHasNoOwner = !group.ownerId && !group.createdBy;
  const isCurrentOwner = group.ownerId === userId || group.createdBy === userId;
  const requestedOwner = options?.appRole !== "ADMIN";
  const adminRole: GroupRole = isCurrentOwner || (groupHasNoOwner && requestedOwner) ? "OWNER" : "ADMIN";

  const memberIdsPatch = { memberIds: arrayUnion(userId), updatedAt: serverTimestamp() };
  const ownerPatch = adminRole === "OWNER"
    ? { ownerId: userId, createdBy: userId, ownerEmail: resolvedEmail || null, ...memberIdsPatch }
    : memberIdsPatch;

  await setDoc(doc(db, GROUPS_COLLECTION, groupId), ownerPatch, { merge: true });
  await setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId), ownerPatch, { merge: true });
  await setDoc(doc(db, GROUP_MEMBERS_COLLECTION, `${groupId}_${userId}`), {
    id: `${groupId}_${userId}`,
    groupId,
    userId,
    role: adminRole,
    nickname,
    email: resolvedEmail || existingMember?.email || "",
    avatarUrl: existingMember?.avatarUrl ?? "",
    status: "active",
    updatedAt: serverTimestamp()
  }, { merge: true });

  const refreshedGroupSnapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
  return { id: refreshedGroupSnapshot.id, ...refreshedGroupSnapshot.data() } as Group;
}

export async function prepareGroupAdminAccess(
  groupId: string,
  userId: string,
  options?: { nickname?: string; email?: string; avatarUrl?: string | null; appRole?: GroupRole }
) {
  const authEmail = getFirebaseAuth().currentUser?.email ?? options?.email ?? null;
  const trustedAdmin = Boolean(options?.appRole && canManageGames(options.appRole));

  if (trustedAdmin) {
    return forceSyncGroupAdminAccess(groupId, userId, {
      nickname: options?.nickname,
      email: authEmail,
      appRole: options?.appRole
    });
  }

  await ensureGroupOwnership(groupId, userId, authEmail);

  const db = getFirebaseFirestore();
  let groupSnapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
  if (!groupSnapshot.exists()) {
    throw new Error("This group no longer exists.");
  }

  let group = { id: groupSnapshot.id, ...groupSnapshot.data() } as Group;
  let member = await ensureActiveGroupMembership(groupId, userId, { ...options, email: authEmail ?? options?.email });
  let role = resolveEffectiveRole(member, group, userId, authEmail ?? member?.email);
  const ownerEmail = normalizeEmail(authEmail) || normalizeEmail(member?.email) || group.ownerEmail || null;

  if (canManageGames(role)) {
    const adminRole: GroupRole = options?.appRole === "OWNER" || role === "OWNER" ? "OWNER" : "ADMIN";
    // Same rule as forceSyncGroupAdminAccess: never overwrite ownerId/createdBy for a plain ADMIN,
    // only when this user is (or is about to legitimately become) the OWNER.
    const groupHasNoOwner = !group.ownerId && !group.createdBy;
    const isCurrentOwner = group.ownerId === userId || group.createdBy === userId;
    const memberIdsPatch = { memberIds: arrayUnion(userId), updatedAt: serverTimestamp() };
    const ownerPatch = adminRole === "OWNER" && (groupHasNoOwner || isCurrentOwner)
      ? { ownerId: userId, createdBy: userId, ownerEmail, ...memberIdsPatch }
      : memberIdsPatch;

    await setDoc(doc(db, GROUPS_COLLECTION, groupId), ownerPatch, { merge: true });
    await setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId), ownerPatch, { merge: true });
    await upsertGroupMember({
      groupId,
      userId,
      role: adminRole,
      nickname: await resolveMemberNickname(groupId, userId, {
        explicit: options?.nickname,
        group,
        existingMember: member
      }),
      email: ownerEmail ?? member?.email ?? "",
      avatarUrl: options?.avatarUrl ?? member?.avatarUrl ?? "",
      status: "active"
    });

    groupSnapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
    group = groupSnapshot.exists()
      ? ({ id: groupSnapshot.id, ...groupSnapshot.data() } as Group)
      : group;
    member = await getCurrentGroupMember(groupId, userId);
    role = resolveEffectiveRole(member, group, userId, ownerEmail ?? member?.email);
  }

  if (!canManageGames(role)) {
    throw new Error("Only group admins can do this.");
  }

  return group;
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
  const groupRef = doc(db, GROUPS_COLLECTION, payload.groupId);
  const schemaGroupRef = doc(db, GROUPS_SCHEMA_COLLECTION, payload.groupId);
  const memberRef = doc(db, GROUP_MEMBERS_COLLECTION, memberId);

  const { resolvedRole, resolvedSlot } = await runTransaction(db, async (transaction) => {
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
    const isOwnerAccount = isGroupOwnerAccount(groupData, payload.userId, payload.email);
    const isFirstCreatorSlot = slot.id === plannedMembers[0]?.id && !groupData.ownerId && !groupData.createdBy;
    const role = payload.role ?? (isOwnerAccount || isFirstCreatorSlot ? "OWNER" : "PLAYER");
    const ownerPatch = buildOwnerPatch(groupData, payload.userId, role, payload.email);

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

    // Only write the membership doc here when it doesn't need isGroupOwner()'s security-rule
    // check to see this very transaction's own ownerId write — see the OWNER branch below for why.
    if (role !== "OWNER") {
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
    }

    return { resolvedRole: role, resolvedSlot: slot };
  });

  if (resolvedRole === "OWNER" && resolvedSlot) {
    // Firestore security rules resolve get()/exists() against the transaction's consistent read
    // snapshot, not other writes made earlier in the SAME transaction — so a groupMembers create
    // with role "OWNER" can never see the ownerId this same transaction just set on friendGroups,
    // and the whole transaction gets denied (leaving the group ownerless forever, since retrying
    // hits the identical deadlock). Write it as a follow-up call instead, once ownerId is actually
    // committed and visible to a fresh get().
    await setDoc(memberRef, {
      id: memberId,
      groupId: payload.groupId,
      userId: payload.userId,
      role: "OWNER",
      nickname: resolvedSlot.nickname,
      email: payload.email ?? "",
      avatarUrl: payload.avatarUrl ?? "",
      participantSlotId: resolvedSlot.id,
      status: "active",
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

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
