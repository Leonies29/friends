import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { AttendanceStatus, ScheduleEvent } from "@/types";

export const SCHEDULE_EVENTS_COLLECTION = "scheduleEvents";

export async function listScheduleEvents(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, SCHEDULE_EVENTS_COLLECTION), where("groupId", "==", groupId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as ScheduleEvent)
    .sort((a, b) => `${a.date} ${a.startTime || a.time || ""}`.localeCompare(`${b.date} ${b.startTime || b.time || ""}`));
}

export async function createScheduleEvent(groupId: string, input: {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  description?: string;
}) {
  const db = getFirebaseFirestore();
  const created = await addDoc(collection(db, SCHEDULE_EVENTS_COLLECTION), {
    groupId,
    title: input.title,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime ?? "",
    time: input.startTime,
    location: input.location,
    meetingLocation: input.location,
    description: input.description ?? "",
    notes: "",
    attendance: {},
    readiness: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return created.id;
}

export async function updateScheduleEvent(eventId: string, data: Partial<Omit<ScheduleEvent, "id" | "groupId">>) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, SCHEDULE_EVENTS_COLLECTION, eventId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function setScheduleAttendance(eventId: string, userId: string, status: AttendanceStatus) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, SCHEDULE_EVENTS_COLLECTION, eventId), {
    [`attendance.${userId}`]: status,
    [`readiness.${userId}`]: status,
    updatedAt: serverTimestamp()
  });
}

export async function deleteScheduleEvent(eventId: string) {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, SCHEDULE_EVENTS_COLLECTION, eventId));
}

export function summarizeAttendance(event: Pick<ScheduleEvent, "attendance" | "readiness">, memberIds: string[]) {
  const attendance = event.attendance ?? {};
  const readiness = event.readiness ?? {};
  const getStatus = (memberId: string): AttendanceStatus | "pending" => {
    const status = attendance[memberId] ?? readiness[memberId];
    if (status === "ready" || status === "late" || status === "unavailable") return status;
    return "pending";
  };

  return memberIds.reduce((summary, memberId) => {
    const status = getStatus(memberId);
    summary[status] += 1;
    return summary;
  }, { ready: 0, late: 0, unavailable: 0, pending: 0 });
}
