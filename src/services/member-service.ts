import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { GroupMember, GroupRole } from "@/types";
import { GROUP_MEMBERS_COLLECTION, listGroupMembers } from "@/services/group-service";

export { listGroupMembers };

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

export async function removeGroupMember(groupId: string, userId: string) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, GROUP_MEMBERS_COLLECTION, `${groupId}_${userId}`), {
    status: "removed",
    removedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
