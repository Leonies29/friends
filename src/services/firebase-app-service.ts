import {
  arrayUnion,
  collection,
  doc,
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

export interface CreateGroupInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  invitees: string;
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
  const db = getFirebaseFirestore();
  const inviteCode = buildInviteCode(input.name);
  const id = `${slugify(input.name)}-${inviteCode.split("-").at(-1)}`;

  await setDoc(doc(db, "friendGroups", id), {
    name: input.name.trim() || "Untitled Quest Group",
    inviteCode,
    description: `Private quest space for ${input.destination.trim() || "a new destination"}.`,
    destination: input.destination.trim(),
    dates: [input.startDate, input.endDate].filter(Boolean).join(" to ") || "Custom dates",
    startDate: input.startDate,
    endDate: input.endDate,
    invitees: input.invitees.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
    vibe: input.vibe.trim(),
    gameModes: input.gameModes,
    gameStarted: false,
    status: "setup",
    currentDay: 0,
    memberIds: [],
    createdBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await setDoc(doc(db, "appConfig", id), {
    activeGroupId: id,
    name: input.name.trim() || "Untitled Quest Group",
    destination: input.destination.trim(),
    inviteCode,
    currentDay: 0,
    totalDays: 7,
    gameStarted: false,
    status: "setup",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id,
    inviteCode,
    name: input.name.trim() || "Untitled Quest Group",
    destination: input.destination.trim()
  };
}


export async function getGroupByInviteCode(inviteCode: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, "friendGroups"), where("inviteCode", "==", inviteCode)));
  const group = snapshot.docs[0];
  return group ? { id: group.id, ...group.data() } : null;
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
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, "friendGroups"), where("inviteCode", "==", inviteCode)));
  return snapshot.docs[0]?.id ?? null;
}

async function uploadAvatar(userId: string, file?: File) {
  if (!file) return null;

  const storage = getFirebaseStorage();
  const avatarRef = ref(storage, `avatars/${userId}/${Date.now()}-${file.name}`);
  await uploadBytes(avatarRef, file);
  return getDownloadURL(avatarRef);
}

export async function registerUserAndJoinGroup(input: RegisterInput) {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
  const userId = credential.user.uid;
  const avatarUrl = await uploadAvatar(userId, input.avatarFile);
  const groupId = input.groupId || (await findGroupIdByInviteCode(input.inviteCode)) || input.inviteCode;

  await setDoc(doc(db, "users", userId), {
    username: input.username,
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

  await setDoc(doc(db, "friendGroups", groupId), {
    memberIds: arrayUnion(userId),
    createdBy: userId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await claimPlannedMember(groupId, input.username, userId);

  return credential.user;
}


export async function signInExistingAccount(email: string, password: string) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInAndJoinGroup(email: string, password: string, groupId: string, inviteCode: string) {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userId = credential.user.uid;
  const resolvedGroupId = groupId || (await findGroupIdByInviteCode(inviteCode)) || inviteCode;

  await setDoc(doc(db, "users", userId), {
    email,
    groupIds: arrayUnion(resolvedGroupId),
    activeGroupId: resolvedGroupId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "friendGroups", resolvedGroupId), {
    memberIds: arrayUnion(userId),
    updatedAt: serverTimestamp()
  }, { merge: true });

  return credential.user;
}

export async function requestPasswordReset(email: string) {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}
