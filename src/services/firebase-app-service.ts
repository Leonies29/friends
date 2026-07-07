import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuth } from "@/firebase/auth";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { getFirebaseStorage } from "@/firebase/storage";
import {
  claimParticipant,
  createGroup,
  findGroupIdByInviteCode as findNormalizedGroupIdByInviteCode,
  getGroupByInviteCode as getNormalizedGroupByInviteCode,
  GROUPS_COLLECTION,
  GROUPS_SCHEMA_COLLECTION,
  resolveJoinRole,
  upsertGroupMember
} from "@/services/group-service";

export interface CreateGroupInput {
  name: string;
  destination: string;
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
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  groupId: string;
  inviteCode: string;
  avatarFile?: File;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quest-group";
}

function buildInviteCode(groupName: string) {
  const base = groupName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase();
  return `${base || "QUEST"}-${Math.floor(100 + Math.random() * 900)}`;
}

export async function createFriendGroup(input: CreateGroupInput): Promise<CreatedGroup> {
  const ownerNickname = input.ownerNickname.trim();
  const friendNicknames = input.friendNicknames.map((item) => item.trim()).filter(Boolean);
  const group = await createGroup({
    name: input.name,
    destination: input.destination,
    startDate: input.startDate,
    endDate: input.endDate,
    description: `Private quest space for ${input.destination.trim() || "a new destination"}.`,
    vibe: input.vibe.trim(),
    gameModes: input.gameModes,
    participantNicknames: [ownerNickname, ...friendNicknames]
  });

  return {
    id: group.id,
    inviteCode: group.inviteCode,
    name: group.name,
    destination: group.destination
  };
}


export async function getGroupByInviteCode(inviteCode: string) {
  return getNormalizedGroupByInviteCode(inviteCode);
}

async function claimPlannedMember(groupId: string, nickname: string, userId: string) {
  if (!nickname) return;

  const db = getFirebaseFirestore();
  const groupSnapshot = await getDocs(query(collection(db, "friendGroups"), where("__name__", "==", groupId)));
  const groupData = groupSnapshot.docs[0]?.data();
  const plannedMembers = Array.isArray(groupData?.plannedMembers) ? groupData.plannedMembers : [];
  const nextMembers = plannedMembers.map((member: { nickname?: string; claimedBy?: string | null }) =>
    member.nickname === nickname ? { ...member, claimedBy: userId } : member
  );

  if (nextMembers.length) {
    await setDoc(doc(db, "friendGroups", groupId), { plannedMembers: nextMembers, updatedAt: serverTimestamp() }, { merge: true });
  }
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

async function ensureUserDocument(userId: string, email: string, groupId?: string | null) {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", userId);
  const userSnapshot = await getDoc(userRef);
  const existing = userSnapshot.exists() ? userSnapshot.data() : {};
  const resolvedGroupId = groupId || existing.activeGroupId || null;
  const username = existing.username || email.split("@")[0] || "Quest Hero";

  await setDoc(userRef, {
    username,
    email,
    avatarUrl: existing.avatarUrl || "",
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
    const groupPatch: Record<string, unknown> = {
      memberIds: arrayUnion(userId),
      updatedAt: serverTimestamp()
    };

    if (existing.isAdmin) {
      groupPatch.createdBy = userId;
    }

    await Promise.all([
      setDoc(doc(db, GROUPS_COLLECTION, resolvedGroupId), groupPatch, { merge: true }),
      setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, resolvedGroupId), groupPatch, { merge: true })
    ]);
  }

  return resolvedGroupId;
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

  const groupSnapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
  const groupData = groupSnapshot.exists() ? groupSnapshot.data() : {};
  const plannedMembers = Array.isArray(groupData.plannedMembers) ? groupData.plannedMembers as Array<{ nickname?: string; claimedBy?: string | null }> : [];
  const matchingSlot = plannedMembers.find((member) => member.nickname?.toLowerCase() === username.toLowerCase());

  if (matchingSlot) {
    await claimParticipant({ groupId, userId, nickname: username, email: input.email, avatarUrl });
  } else {
    const role = resolveJoinRole(groupData as import("@/types").Group, userId);
    await Promise.all([
      setDoc(doc(db, GROUPS_COLLECTION, groupId), {
        memberIds: arrayUnion(userId),
        createdBy: groupData.createdBy || userId,
        ownerId: groupData.ownerId || userId,
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, groupId), {
        memberIds: arrayUnion(userId),
        createdBy: groupData.createdBy || userId,
        ownerId: groupData.ownerId || userId,
        updatedAt: serverTimestamp()
      }, { merge: true }),
      upsertGroupMember({
        groupId,
        userId,
        role,
        nickname: username,
        email: input.email,
        avatarUrl,
        status: "active"
      })
    ]);
  }

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

  if (nickname?.trim()) {
    await claimParticipant({ groupId: resolvedGroupId, userId, nickname: nickname.trim(), email });
  } else {
    const groupSnapshot = await getDoc(doc(db, GROUPS_COLLECTION, resolvedGroupId));
    const groupData = groupSnapshot.exists() ? groupSnapshot.data() : {};
    const role = resolveJoinRole(groupData as import("@/types").Group, userId);
    const displayName = email.split("@")[0] || "Trip member";

    await Promise.all([
      setDoc(doc(db, GROUPS_COLLECTION, resolvedGroupId), {
        memberIds: arrayUnion(userId),
        createdBy: groupData.createdBy || (role === "OWNER" ? userId : null),
        ownerId: groupData.ownerId || (role === "OWNER" ? userId : null),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, GROUPS_SCHEMA_COLLECTION, resolvedGroupId), {
        memberIds: arrayUnion(userId),
        createdBy: groupData.createdBy || (role === "OWNER" ? userId : null),
        ownerId: groupData.ownerId || (role === "OWNER" ? userId : null),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      upsertGroupMember({
        groupId: resolvedGroupId,
        userId,
        role,
        nickname: displayName,
        email,
        status: "active"
      })
    ]);
  }

  return credential.user;
}

export async function requestPasswordReset(email: string) {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}
