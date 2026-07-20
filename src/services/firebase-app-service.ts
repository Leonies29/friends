import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuth } from "@/firebase/auth";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { getFirebaseStorage } from "@/firebase/storage";
import type { DestinationId } from "@/lib/destinations";
import {
  claimParticipant,
  createGroup,
  findGroupIdByInviteCode as findNormalizedGroupIdByInviteCode,
  getGroupByInviteCode as getNormalizedGroupByInviteCode,
  GROUPS_COLLECTION,
  GROUPS_SCHEMA_COLLECTION,
  buildOwnerPatch,
  resolveJoinRole,
  setActiveGroupForUser,
  upsertGroupMember
} from "@/services/group-service";

export interface CreateGroupInput {
  name: string;
  destination: string;
  destinationId?: DestinationId;
  startDate: string;
  endDate: string;
  invitees: string;
  ownerNickname: string;
  friendNicknames: string[];
  vibe: string;
  gameModes: string[];
}

export interface CreatedGroup {
  id: string;
  inviteCode: string;
  name: string;
  destination: string;
  destinationId?: DestinationId;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  groupId: string;
  inviteCode: string;
  avatarFile?: File;
}

export async function createFriendGroup(
  input: CreateGroupInput,
  ownerId?: string | null,
  ownerEmail?: string | null
): Promise<CreatedGroup> {
  const ownerNickname = input.ownerNickname.trim();
  const friendNicknames = input.friendNicknames.map((item) => item.trim()).filter(Boolean);
  const group = await createGroup({
    name: input.name,
    destination: input.destination,
    destinationId: input.destinationId,
    startDate: input.startDate,
    endDate: input.endDate,
    description: `Private quest space for ${input.destination.trim() || "a new destination"}.`,
    vibe: input.vibe.trim(),
    gameModes: input.gameModes,
    participantNicknames: [ownerNickname, ...friendNicknames],
    ownerId: ownerId ?? null,
    ownerEmail: ownerEmail ?? null
  });

  if (ownerId) {
    await setActiveGroupForUser(ownerId, group.id);
  }

  return {
    id: group.id,
    inviteCode: group.inviteCode,
    name: group.name,
    destination: group.destination,
    destinationId: group.destinationId
  };
}


export async function getGroupByInviteCode(inviteCode: string) {
  return getNormalizedGroupByInviteCode(inviteCode);
}

export async function findGroupIdByInviteCode(inviteCode: string) {
  return findNormalizedGroupIdByInviteCode(inviteCode);
}

async function uploadAvatar(userId: string, file?: File) {
  if (!file) return null;

  const storage = getFirebaseStorage();
  const avatarRef = ref(storage, `avatars/${userId}/${Date.now()}-${file.name}`);
  await uploadBytes(avatarRef, file);
  return getDownloadURL(avatarRef);
}

async function ensureUserDocument(userId: string, email: string, groupId?: string | null, fallbackAvatarUrl?: string | null) {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", userId);
  const userSnapshot = await getDoc(userRef);
  const existing = userSnapshot.exists() ? userSnapshot.data() : {};
  const resolvedGroupId = groupId || existing.activeGroupId || null;
  const username = existing.username || email.split("@")[0] || "Quest Hero";

  await setDoc(userRef, {
    username,
    email,
    avatarUrl: existing.avatarUrl || fallbackAvatarUrl || "",
    level: existing.level || 1,
    totalXp: existing.totalXp || 0,
    joinedAt: existing.joinedAt || new Date().toISOString(),
    groupIds: resolvedGroupId ? arrayUnion(resolvedGroupId) : existing.groupIds || [],
    activeGroupId: resolvedGroupId || existing.activeGroupId || "",
    stats: {
      challengesCompleted: existing.stats?.challengesCompleted || 0,
      assassinations: existing.stats?.assassinations || 0,
      photosUploaded: existing.stats?.photosUploaded || 0,
      pointsEarned: existing.stats?.pointsEarned || 0,
      relicsCollected: existing.stats?.relicsCollected || 0,
      catsFound: existing.stats?.catsFound || 0
    },
    badges: Array.isArray(existing.badges) ? existing.badges : [],
    achievements: Array.isArray(existing.achievements) ? existing.achievements : [],
    repairedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (resolvedGroupId) {
    // Ownership is decided by group-service.ts's OWNER/ADMIN role system (groupMembers docs +
    // friendGroups.ownerId), never by a flag on the user's own doc — a stray legacy `isAdmin`
    // used to make this silently hand the caller createdBy on the group, which is exactly the
    // kind of self-service ownership grab the tightened Firestore rules now (correctly) reject.
    const groupPatch: Record<string, unknown> = {
      memberIds: arrayUnion(userId),
      updatedAt: serverTimestamp()
    };

    await Promise.all([
      setDoc(doc(db, GROUPS_COLLECTION, resolvedGroupId), groupPatch, { merge: true }),
      setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, resolvedGroupId), groupPatch, { merge: true })
    ]);
  }

  return resolvedGroupId;
}

async function joinGroupWithProfile(groupId: string, userId: string, email: string, nickname: string, avatarUrl?: string | null) {
  const db = getFirebaseFirestore();
  const groupSnapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
  const groupData = groupSnapshot.exists() ? groupSnapshot.data() : {};
  const plannedMembers = Array.isArray(groupData.plannedMembers) ? groupData.plannedMembers as Array<{ nickname?: string; claimedBy?: string | null }> : [];
  const matchingSlot = plannedMembers.find((member) => member.nickname?.toLowerCase() === nickname.toLowerCase());

  if (matchingSlot) {
    await claimParticipant({ groupId, userId, nickname, email, avatarUrl: avatarUrl ?? undefined });
    return;
  }

  const group = groupData as import("@/types").Group;
  const role = resolveJoinRole(group, userId, email);
  const ownerPatch = buildOwnerPatch(group, userId, role, email);
  await Promise.all([
    setDoc(doc(db, GROUPS_COLLECTION, groupId), {
      memberIds: arrayUnion(userId),
      ...ownerPatch,
      updatedAt: serverTimestamp()
    }, { merge: true }),
    setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId), {
      memberIds: arrayUnion(userId),
      ...ownerPatch,
      updatedAt: serverTimestamp()
    }, { merge: true }),
    upsertGroupMember({
      groupId,
      userId,
      role,
      nickname,
      email,
      avatarUrl: avatarUrl ?? "",
      status: "active"
    })
  ]);
}

export async function registerUserAndJoinGroup(input: RegisterInput) {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
  const userId = credential.user.uid;
  const avatarUrl = await uploadAvatar(userId, input.avatarFile);
  const groupId = input.groupId || (await findGroupIdByInviteCode(input.inviteCode)) || input.inviteCode;
  const username = input.username.trim() || input.email.split("@")[0] || "Trip member";

  await setDoc(doc(db, "users", userId), {
    username,
    email: input.email,
    avatarUrl,
    country: "",
    countryCode: "",
    flagEmoji: "",
    level: 1,
    totalXp: 0,
    joinedAt: new Date().toISOString(),
    groupIds: [groupId],
    activeGroupId: groupId,
    stats: {
      challengesCompleted: 0,
      assassinations: 0,
      photosUploaded: 0,
      pointsEarned: 0,
      relicsCollected: 0,
      catsFound: 0
    },
    badges: [],
    achievements: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  await joinGroupWithProfile(groupId, userId, input.email, username, avatarUrl);

  return credential.user;
}


export async function signInExistingAccount(email: string, password: string) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(credential.user.uid, email);
  return credential.user;
}

export async function signInAndJoinGroup(email: string, password: string, groupId: string, inviteCode: string, nickname?: string) {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userId = credential.user.uid;
  const resolvedGroupId = groupId || (await findGroupIdByInviteCode(inviteCode)) || inviteCode;

  await ensureUserDocument(userId, email, resolvedGroupId);

  await setDoc(doc(db, "users", userId), {
    email,
    groupIds: arrayUnion(resolvedGroupId),
    activeGroupId: resolvedGroupId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  const displayName = nickname?.trim() || email.split("@")[0] || "Trip member";
  await joinGroupWithProfile(resolvedGroupId, userId, email, displayName);

  return credential.user;
}

export async function signInWithGoogleAndJoinGroup(options?: { groupId?: string; inviteCode?: string; nickname?: string }) {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  const user = credential.user;
  const email = user.email ?? "";
  const displayName = options?.nickname?.trim() || user.displayName?.trim() || email.split("@")[0] || "Trip member";

  const groupId = options?.groupId || (options?.inviteCode ? await findGroupIdByInviteCode(options.inviteCode) : null) || options?.inviteCode || null;
  await ensureUserDocument(user.uid, email, groupId, user.photoURL);

  if (groupId) {
    await joinGroupWithProfile(groupId, user.uid, email, displayName, user.photoURL);
  }

  return user;
}

export async function requestPasswordReset(email: string) {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}
