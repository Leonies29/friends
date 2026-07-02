import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { ActivityItem } from "@/types/game";

export async function listRecentActivity(groupId: string, max = 8) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, "activityFeed"), where("groupId", "==", groupId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as ActivityItem)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, max);
}
