import {
  addDoc,
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
    title: "Challenges",
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
    title: "History of Istanbul & Turkey",
    description: "Timed multiple-choice quiz on Istanbul and Turkish history. +10 pts per correct answer, +5 speed bonus.",
    icon: "CircleHelp",
    category: "quiz",
    enabled: false,
    visible: true,
    archived: false,
    status: "inactive",
    order: 50,
    xpRules: [{ id: "quiz-answer", label: "Correct quiz answer", amount: 10, sourceType: "game" }]
  },
  {
    title: "Travel Bingo",
    description: "Custom 5×5 grid, text-only proofs, and admin moderation.",
    icon: "Grid3X3",
    category: "bingo",
    enabled: false,
    visible: true,
    archived: false,
    status: "inactive",
    order: 60,
    xpRules: [{ id: "bingo-cell", label: "Validated bingo challenge", amount: 1, sourceType: "game" }]
  }
];

export async function listGames(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, GAMES_COLLECTION), where("groupId", "==", groupId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Game)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Quests and Assassin eliminations never carry a gameId at their point of completion — this
// resolves the group's canonical game doc for that category so their XP can still go through
// awardGameXp (and therefore respect that game's per-game team mode).
export async function resolveGameByCategory(groupId: string, category: GameCategory) {
  const games = await listGames(groupId);
  return games.find((game) => game.category === category) ?? null;
}

export async function getGame(gameId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, GAMES_COLLECTION, gameId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Game;
}

// Groups created before the "Secret Challenges" → "Challenges" rename already have the old title
// baked into their games doc — renaming the template only affects newly-seeded groups. Fix it up
// in place the next time anyone loads this group's games, instead of requiring a manual rename.
async function renameLegacySecretChallengesGame(groupId: string, games: Game[]) {
  const legacy = games.find((game) => game.category === "challenge" && game.title === "Secret Challenges");
  if (!legacy) return games;
  await updateGame(legacy.id, { title: "Challenges" });
  return games.map((game) => (game.id === legacy.id ? { ...game, title: "Challenges" } : game));
}

export async function ensureDefaultGames(groupId: string) {
  const existing = await listGames(groupId);
  if (existing.length) return renameLegacySecretChallengesGame(groupId, existing);

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
  const createdAt = Date.now();
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
    order: createdAt,
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

// Dot-path update so this only ever touches settings.scoringMode — a plain `updateGame(gameId,
// { settings: { scoringMode } })` would replace the whole settings map and wipe out sibling
// fields like awardsFormat/checklistItems.
export async function setGameScoringMode(gameId: string, mode: "individual" | "team") {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    "settings.scoringMode": mode,
    updatedAt: serverTimestamp()
  });
}

export async function duplicateGame(game: Game) {
  const db = getFirebaseFirestore();
  const { id: duplicatedFromId, createdAt: _createdAt, updatedAt: _updatedAt, ...gameData } = game;
  const duplicatedAt = Date.now();
  const created = await addDoc(collection(db, GAMES_COLLECTION), {
    ...gameData,
    title: `${game.title} copy`,
    enabled: false,
    status: "draft",
    duplicatedFromId,
    order: duplicatedAt,
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
