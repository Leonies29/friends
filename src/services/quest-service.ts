import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { QUEST_TEMPLATES, SECRET_QUEST_TEMPLATES } from "@/lib/game-data";
import { addXpTransaction } from "@/services/xp-service";
import type { QuestCompletion, QuestDoc } from "@/types/game";

const QUESTS = "quests";
const QUEST_COMPLETIONS = "questCompletions";
const ACTIVITY = "activityFeed";

export async function ensureGroupQuests(groupId: string) {
  const db = getFirebaseFirestore();
  const existing = await getDocs(query(collection(db, QUESTS), where("groupId", "==", groupId)));
  if (existing.size) {
    return existing.docs.map((item) => ({ id: item.id, ...item.data() }) as QuestDoc);
  }

  const templates = [...QUEST_TEMPLATES, ...SECRET_QUEST_TEMPLATES];
  await Promise.all(templates.map((template) =>
    setDoc(doc(db, QUESTS, `${groupId}_${template.key}`), {
      groupId,
      key: template.key,
      title: template.title,
      description: template.description,
      category: template.category,
      difficulty: template.difficulty,
      xpReward: template.xpReward,
      isSecret: template.isSecret,
      unlocked: !template.isSecret,
      completedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  ));

  return listGroupQuests(groupId);
}

export async function listGroupQuests(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, QUESTS), where("groupId", "==", groupId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as QuestDoc)
    .filter((quest) => !quest.archived);
}

export async function completeQuest(input: {
  groupId: string;
  quest: QuestDoc;
  userId: string;
  comment?: string;
}): Promise<{ unlockedSecret?: string }> {
  const db = getFirebaseFirestore();
  if (input.quest.completedBy.includes(input.userId)) return {};

  const completedBy = [...input.quest.completedBy, input.userId];
  await setDoc(doc(db, QUESTS, input.quest.id), {
    completedBy,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await addDoc(collection(db, QUEST_COMPLETIONS), {
    groupId: input.groupId,
    questId: input.quest.id,
    userId: input.userId,
    comment: input.comment ?? "",
    completedAt: new Date().toISOString()
  } satisfies Omit<QuestCompletion, "id">);

  await addXpTransaction({
    groupId: input.groupId,
    userId: input.userId,
    amount: input.quest.xpReward,
    sourceType: "quest",
    sourceId: input.quest.id,
    reason: `Completed quest: ${input.quest.title}`,
    createdBy: input.userId
  });

  await addDoc(collection(db, ACTIVITY), {
    groupId: input.groupId,
    type: "quest",
    title: `${input.quest.title} completed`,
    subtitle: input.comment || "Quest validated",
    createdAt: new Date().toISOString()
  });

  if (input.quest.isSecret) {
    await unlockSultansSecretIfReady(input.groupId);
    return {};
  }

  const unlockedSecret = await unlockRandomSecretQuest(input.groupId);
  return { unlockedSecret };
}

async function unlockRandomSecretQuest(groupId: string) {
  const quests = await listGroupQuests(groupId);
  const locked = quests.filter((quest) => quest.isSecret && !quest.unlocked && quest.key !== "sultans-secret");
  if (!locked.length) return undefined;

  const next = locked[Math.floor(Math.random() * locked.length)];
  const db = getFirebaseFirestore();
  await setDoc(doc(db, QUESTS, next.id), { unlocked: true, updatedAt: serverTimestamp() }, { merge: true });
  await addDoc(collection(db, ACTIVITY), {
    groupId,
    type: "secret_unlock",
    title: "New Secret Quest Unlocked",
    subtitle: next.title,
    createdAt: new Date().toISOString()
  });
  return next.title;
}

async function unlockSultansSecretIfReady(groupId: string) {
  const quests = await listGroupQuests(groupId);
  const secrets = quests.filter((quest) => quest.isSecret && quest.key !== "sultans-secret");
  const allDiscovered = secrets.every((quest) => quest.completedBy.length > 0);
  const sultan = quests.find((quest) => quest.key === "sultans-secret");
  if (!allDiscovered || !sultan || sultan.unlocked) return;

  const db = getFirebaseFirestore();
  await setDoc(doc(db, QUESTS, sultan.id), { unlocked: true, updatedAt: serverTimestamp() }, { merge: true });
  await addDoc(collection(db, ACTIVITY), {
    groupId,
    type: "secret_unlock",
    title: "New Secret Quest Unlocked",
    subtitle: "👑 Sultan's Secret",
    createdAt: new Date().toISOString()
  });
}

export async function listQuestCompletions(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, QUEST_COMPLETIONS), where("groupId", "==", groupId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as QuestCompletion);
}

export async function createGroupQuest(groupId: string, input: {
  title: string;
  description: string;
  category: QuestDoc["category"];
  difficulty: QuestDoc["difficulty"];
  xpReward: number;
  isSecret?: boolean;
}) {
  const db = getFirebaseFirestore();
  const key = `custom-${Date.now()}`;
  const id = `${groupId}_${key}`;
  await setDoc(doc(db, QUESTS, id), {
    groupId,
    key,
    title: input.title,
    description: input.description,
    category: input.category,
    difficulty: input.difficulty,
    xpReward: input.xpReward,
    isSecret: input.isSecret ?? false,
    unlocked: !(input.isSecret ?? false),
    completedBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return id;
}

export async function updateGroupQuest(questId: string, data: Partial<Pick<QuestDoc, "title" | "description" | "category" | "difficulty" | "xpReward" | "isSecret" | "unlocked">>) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, QUESTS, questId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function removeGroupQuest(questId: string) {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, QUESTS, questId));
}
