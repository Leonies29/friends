import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { ASSASSIN_MISSIONS_BY_DESTINATION } from "@/lib/assassin-default-missions";
import { pickForDestination, type DestinationId } from "@/lib/destinations";
import type { AssassinMissionTemplate } from "@/types/game";

export const MISSION_TEMPLATES = "assassinMissionTemplates";

export async function ensureMissionLibrary(groupId: string, destinationId?: DestinationId) {
  const db = getFirebaseFirestore();
  const existing = await getDocs(query(collection(db, MISSION_TEMPLATES), where("groupId", "==", groupId)));
  if (existing.size) {
    return listMissionTemplates(groupId);
  }

  const templates = pickForDestination(ASSASSIN_MISSIONS_BY_DESTINATION, destinationId);
  await Promise.all(templates.map((template) =>
    setDoc(doc(db, MISSION_TEMPLATES, `${groupId}_${template.key}`), {
      groupId,
      title: template.title,
      text: template.text,
      difficulty: template.difficulty,
      category: template.category,
      active: true,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  ));

  return listMissionTemplates(groupId);
}

export async function listMissionTemplates(groupId: string, includeArchived = false) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, MISSION_TEMPLATES), where("groupId", "==", groupId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as AssassinMissionTemplate)
    .filter((item) => includeArchived || !item.archived)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function createMissionTemplate(groupId: string, input: {
  title: string;
  text: string;
  difficulty: AssassinMissionTemplate["difficulty"];
  category: AssassinMissionTemplate["category"];
}) {
  const db = getFirebaseFirestore();
  const id = `${groupId}_${Date.now()}`;
  await setDoc(doc(db, MISSION_TEMPLATES, id), {
    groupId,
    title: input.title,
    text: input.text,
    difficulty: input.difficulty,
    category: input.category,
    active: true,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return id;
}

export async function updateMissionTemplate(templateId: string, data: Partial<Pick<AssassinMissionTemplate, "title" | "text" | "difficulty" | "category" | "active">>) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, MISSION_TEMPLATES, templateId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function archiveMissionTemplate(templateId: string) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, MISSION_TEMPLATES, templateId), {
    archived: true,
    active: false,
    updatedAt: serverTimestamp()
  });
}

export async function duplicateMissionTemplate(groupId: string, template: AssassinMissionTemplate) {
  return createMissionTemplate(groupId, {
    title: `${template.title} (copy)`,
    text: template.text,
    difficulty: template.difficulty,
    category: template.category
  });
}

// excludeTemplateId keeps a player from getting the exact same mission twice in a row after
// being reassigned. Falls back to allowing a repeat only when it's genuinely the only option.
export function pickRandomTemplate(templates: AssassinMissionTemplate[], excludeTemplateId?: string | null) {
  const active = templates.filter((item) => item.active && !item.archived);
  if (!active.length) return null;
  const pool = excludeTemplateId ? active.filter((item) => item.id !== excludeTemplateId) : active;
  const finalPool = pool.length ? pool : active;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}
