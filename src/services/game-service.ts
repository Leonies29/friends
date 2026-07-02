import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { isGameInMenu } from "@/lib/game-navigation";
import type { Game, GameCategory, XpRule } from "@/types";

export const GAMES_COLLECTION = "games";

export const defaultGameTemplates: Array<Pick<Game, "title" | "description" | "icon" | "category" | "enabled" | "visible" | "archived" | "status" | "order" | "xpRules">> = [
  {
    title: "Assassin",
    description: "Give each player a private target and a simple mission.",
    icon: "Shield",
    category: "assassin",
    enabled: false,
    visible: true,
    archived: false,
    status: "inactive",
    order: 10,
    xpRules: [{ id: "elimination", label: "Successful elimination", amount: 250, sourceType: "game" }]
  },
  {
    title: "Secret Challenges",
    description: "Assign private dares and approve proof when completed.",
    icon: "Sparkles",
    category: "challenge",
    enabled: true,
    visible: true,
    archived: false,
    status: "active",
    order: 20,
    xpRules: [{ id: "approved-challenge", label: "Approved challenge", amount: 100, sourceType: "challenge" }]
  },
  {
    title: "Photo Contest",
    description: "Share trip photos, react, comment, and feature the best moments.",
    icon: "Camera",
    category: "photo",
    enabled: true,
    visible: true,
    archived: false,
    status: "active",
    order: 30,
    xpRules: [{ id: "photo-upload", label: "Photo upload", amount: 10, sourceType: "photo" }]
  },
  {
    title: "Treasure Hunt",
    description: "Collect reusable quest items around the destination.",
    icon: "Map",
    category: "treasure",
    enabled: true,
    visible: true,
    archived: false,
    status: "active",
    order: 40,
    xpRules: [{ id: "quest-item", label: "Quest item collected", amount: 75, sourceType: "quest" }]
  },
  {
    title: "Histoire d'Istanbul et de la Turquie",
    description: "Quiz QCM chronométré sur Istanbul et la Turquie. +10 pts par bonne réponse, +5 bonus rapidité.",
    icon: "CircleHelp",
    category: "quiz",
    enabled: false,
    visible: true,
    archived: false,
    status: "inactive",
    order: 50,
    xpRules: [{ id: "quiz-answer", label: "Bonne réponse quiz", amount: 10, sourceType: "game" }]
  },
  {
    title: "Bingo Voyage",
    description: "Grille 5×5 personnalisée, preuves texte uniquement et modération admin.",
    icon: "Grid3X3",
    category: "bingo",
    enabled: false,
    visible: true,
    archived: false,
    status: "inactive",
    order: 60,
    xpRules: [{ id: "bingo-cell", label: "Défi bingo validé", amount: 1, sourceType: "game" }]
  }
];

export async function listGames(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, GAMES_COLLECTION), where("groupId", "==", groupId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Game)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function ensureDefaultGames(groupId: string) {
  const existing = await listGames(groupId);
  if (existing.length) return existing;

  const db = getFirebaseFirestore();
  await Promise.all(defaultGameTemplates.map((template) =>
    addDoc(collection(db, GAMES_COLLECTION), {
      ...template,
      groupId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  ));

  return listGames(groupId);
}

export async function createGame(groupId: string, input: {
  title: string;
  description: string;
  icon: string;
  category: GameCategory;
  xpRules?: XpRule[];
}) {
  const db = getFirebaseFirestore();
  const created = await addDoc(collection(db, GAMES_COLLECTION), {
    groupId,
    title: input.title,
    description: input.description,
    icon: input.icon,
    category: input.category,
    enabled: false,
    visible: true,
    archived: false,
    status: "draft",
    order: Date.now(),
    xpRules: input.xpRules ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return created.id;
}

export async function updateGame(gameId: string, data: Partial<Omit<Game, "id" | "groupId">>) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function duplicateGame(game: Game) {
  const db = getFirebaseFirestore();
  const { id: duplicatedFromId, createdAt: _createdAt, updatedAt: _updatedAt, ...gameData } = game;
  const created = await addDoc(collection(db, GAMES_COLLECTION), {
    ...gameData,
    title: `${game.title} copy`,
    enabled: false,
    status: "draft",
    duplicatedFromId,
    order: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return created.id;
}

export async function setGameActive(gameId: string, active: boolean) {
  if (active) {
    await updateGame(gameId, {
      enabled: true,
      visible: true,
      archived: false,
      status: "active",
      activatedAt: new Date().toISOString()
    });
    return;
  }

  await updateGame(gameId, {
    enabled: false,
    visible: false,
    status: "inactive",
    deactivatedAt: new Date().toISOString()
  });
}

export async function toggleGameActive(game: Pick<Game, "id" | "enabled" | "visible" | "archived">) {
  const shouldActivate = !isGameInMenu(game);
  await setGameActive(game.id, shouldActivate);
  return shouldActivate;
}

export async function listNavGames(groupId: string) {
  const games = await listGames(groupId);
  return games.filter((game) => game.enabled && game.visible && !game.archived);
}

export async function archiveGame(gameId: string) {
  await updateGame(gameId, { archived: true, enabled: false, visible: false, status: "archived" });
}

export async function seedGameTemplatesForGroup(groupId: string) {
  const db = getFirebaseFirestore();
  await Promise.all(defaultGameTemplates.map((template) =>
    setDoc(doc(collection(db, GAMES_COLLECTION)), {
      ...template,
      groupId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  ));
}
