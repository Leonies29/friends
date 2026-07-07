import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { GroupMember, GroupRole } from "@/types";
import { GROUP_MEMBERS_COLLECTION, listAllGroupMembers, listGroupMembers } from "@/services/group-service";

export { listAllGroupMembers, listGroupMembers };

export async function getGroupMember(groupId: string, userId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, GROUP_MEMBERS_COLLECTION, `${groupId}_${userId}`));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as GroupMember) : null;
}

export async function setMemberRole(groupId: string, userId: string, role: GroupRole) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, GROUP_MEMBERS_COLLECTION, `${groupId}_${userId}`), {
    groupId,
    userId,
    role,
    status: "active",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function transferGroupOwnership(groupId: string, fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) {
    throw new Error("Choose a different member to transfer ownership.");
  }

  const db = getFirebaseFirestore();
  const groupRef = doc(db, "friendGroups", groupId);
  const groupSnapshot = await getDoc(groupRef);
  if (!groupSnapshot.exists()) {
    throw new Error("Group not found.");
  }

  const groupData = groupSnapshot.data();
  const currentOwner = groupData.ownerId || groupData.createdBy;
  if (currentOwner !== fromUserId) {
    throw new Error("Only the current owner can transfer ownership.");
  }

  const nextOwner = await getGroupMember(groupId, toUserId);
  if (!nextOwner || nextOwner.status === "inactive" || nextOwner.status === "removed") {
    throw new Error("The new owner must be an active group member.");
  }

  await Promise.all([
    setDoc(groupRef, {
      ownerId: toUserId,
      createdBy: toUserId,
      updatedAt: serverTimestamp()
    }, { merge: true }),
    setDoc(doc(db, "groups", groupId), {
      ownerId: toUserId,
      createdBy: toUserId,
      updatedAt: serverTimestamp()
    }, { merge: true }),
    setMemberRole(groupId, toUserId, "OWNER"),
    setMemberRole(groupId, fromUserId, "PLAYER")
  ]);
}

export async function promoteMemberToAdmin(groupId: string, userId: string) {
  const member = await getGroupMember(groupId, userId);
  if (!member || member.status === "inactive" || member.status === "removed") {
    throw new Error("Member not found or inactive.");
  }
  await setMemberRole(groupId, userId, "ADMIN");
}

export async function demoteMemberToPlayer(groupId: string, userId: string, actingOwnerId: string) {
  const db = getFirebaseFirestore();
  const groupSnapshot = await getDoc(doc(db, "friendGroups", groupId));
  const groupData = groupSnapshot.exists() ? groupSnapshot.data() : null;
  const currentOwner = groupData?.ownerId || groupData?.createdBy;

  if (userId === currentOwner && actingOwnerId === userId) {
    throw new Error("Transfer ownership to another member before stepping down as owner.");
  }

  await setMemberRole(groupId, userId, "PLAYER");
}

export async function setGroupMemberStatus(
  groupId: string,
  userId: string,
  status: GroupMember["status"],
  profile?: { nickname?: string; role?: GroupRole }
) {
  const db = getFirebaseFirestore();
  const memberId = `${groupId}_${userId}`;
  const existing = await getGroupMember(groupId, userId);

  await setDoc(doc(db, GROUP_MEMBERS_COLLECTION, memberId), {
    groupId,
    userId,
    role: profile?.role ?? existing?.role ?? "PLAYER",
    nickname: profile?.nickname ?? existing?.nickname ?? "Player",
    status,
    updatedAt: serverTimestamp(),
    ...(status === "inactive" || status === "removed" ? { deactivatedAt: serverTimestamp() } : {}),
    ...(status === "active" ? { reactivatedAt: serverTimestamp() } : {})
  }, { merge: true });

  if (status === "inactive") {
    const { suspendAssassinPlayer } = await import("@/services/assassin-service");
    await suspendAssassinPlayer(groupId, userId).catch(() => undefined);
  }
}

export async function deactivateGroupMember(
  groupId: string,
  userId: string,
  profile?: { nickname?: string; role?: GroupRole }
) {
  await setGroupMemberStatus(groupId, userId, "inactive", profile);
}

export async function reactivateGroupMember(
  groupId: string,
  userId: string,
  profile?: { nickname?: string; role?: GroupRole }
) {
  await setGroupMemberStatus(groupId, userId, "active", profile);
}

export async function removeGroupMember(groupId: string, userId: string) {
  await setGroupMemberStatus(groupId, userId, "removed");
}
