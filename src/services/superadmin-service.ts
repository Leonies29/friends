import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { GROUPS_COLLECTION } from "@/services/group-service";
import { listAllGroupMembers } from "@/services/member-service";
import { deleteGroupAsSuperAdmin } from "@/services/group-lifecycle-service";
import { notifyUsers } from "@/services/notification-service";
import { memberUserId } from "@/lib/game-members";
import type { Group } from "@/types";

export async function isSuperAdmin(userId: string | null | undefined) {
  if (!userId) return false;
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, "superAdmins", userId));
  return snapshot.exists();
}

export async function listAllGroupsForSuperAdmin() {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(collection(db, GROUPS_COLLECTION));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Group)
    .map((group) => ({
      id: group.id,
      name: group.name || "Untitled trip",
      destination: group.destination || "",
      memberCount: group.memberIds?.length ?? 0,
      createdAt: group.createdAt,
      ownerEmail: group.ownerEmail ?? ""
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteGroupWithNotification(groupId: string, groupName: string) {
  const members = await listAllGroupMembers(groupId);
  const memberUserIds = members.map((member) => memberUserId(member));

  await notifyUsers(memberUserIds, {
    title: "Trip deleted",
    body: `${groupName} was permanently deleted by the app admin.`,
    type: "group_deleted"
  });

  await deleteGroupAsSuperAdmin(groupId);
}
