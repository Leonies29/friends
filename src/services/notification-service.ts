import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { EntityTimestamp, UserNotification } from "@/types";

export const NOTIFICATIONS_COLLECTION = "userNotifications";

function toMillis(value: EntityTimestamp | undefined) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return value.seconds * 1000;
}

export async function notifyUsers(userIds: string[], input: { title: string; body: string; type: UserNotification["type"] }) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUserIds.length) return;

  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  uniqueUserIds.forEach((userId) => {
    const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
    batch.set(notificationRef, {
      id: notificationRef.id,
      userId,
      title: input.title,
      body: input.body,
      type: input.type,
      readAt: null,
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
}

export async function listUserNotifications(userId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as UserNotification)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export async function markAllNotificationsRead(notifications: UserNotification[]) {
  const unread = notifications.filter((item) => !item.readAt);
  if (!unread.length) return;

  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  unread.forEach((item) => {
    batch.update(doc(db, NOTIFICATIONS_COLLECTION, item.id), { readAt: serverTimestamp() });
  });
  await batch.commit();
}
