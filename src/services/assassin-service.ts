import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { AssassinElimination, AssassinGame, AssassinMission, AssassinPlayer } from "@/types/game";

const GAMES = "assassinGames";
const PLAYERS = "assassinPlayers";
const MISSIONS = "assassinMissions";
const ELIMINATIONS = "assassinEliminations";
const ACTIVITY = "activityFeed";

const defaultMissions = [
  "Make your target say the secret word.",
  "Get a selfie with your target without them noticing.",
  "Make your target hold your phone for 10 seconds.",
  "Get your target to buy you a tea.",
  "Make your target recreate a tourist pose."
];

export async function ensureAssassinGame(groupId: string, members: Array<{ id: string; username: string; avatarUrl?: string | null }>) {
  const db = getFirebaseFirestore();
  const existing = await getDocs(query(collection(db, GAMES), where("groupId", "==", groupId)));
  if (existing.size) {
    return loadAssassinState(groupId);
  }

  const gameRef = await addDoc(collection(db, GAMES), {
    groupId,
    status: "active",
    startedAt: new Date().toISOString()
  } satisfies Omit<AssassinGame, "id">);

  const shuffled = [...members].sort(() => Math.random() - 0.5);
  await Promise.all(shuffled.map((member, index) => {
    const target = shuffled[(index + 1) % shuffled.length];
    const playerId = `${groupId}_${member.id}`;
    return Promise.all([
      setDoc(doc(db, PLAYERS, playerId), {
        groupId,
        uid: member.id,
        displayName: member.username,
        avatarUrl: member.avatarUrl ?? "",
        isAlive: true,
        currentTargetId: target.id,
        eliminationCount: 0
      } satisfies Omit<AssassinPlayer, "id">),
      setDoc(doc(db, MISSIONS, playerId), {
        groupId,
        playerId: member.id,
        targetId: target.id,
        missionText: defaultMissions[index % defaultMissions.length],
        assignedAt: new Date().toISOString()
      } satisfies Omit<AssassinMission, "id">)
    ]);
  }));

  return loadAssassinState(groupId);
}

export async function loadAssassinState(groupId: string) {
  const db = getFirebaseFirestore();
  const [games, players, missions, eliminations] = await Promise.all([
    getDocs(query(collection(db, GAMES), where("groupId", "==", groupId))),
    getDocs(query(collection(db, PLAYERS), where("groupId", "==", groupId))),
    getDocs(query(collection(db, MISSIONS), where("groupId", "==", groupId))),
    getDocs(query(collection(db, ELIMINATIONS), where("groupId", "==", groupId)))
  ]);

  return {
    game: games.docs[0] ? ({ id: games.docs[0].id, ...games.docs[0].data() } as AssassinGame) : null,
    players: players.docs.map((item) => ({ id: item.id, ...item.data() }) as AssassinPlayer),
    missions: missions.docs.map((item) => ({ id: item.id, ...item.data() }) as AssassinMission),
    eliminations: eliminations.docs.map((item) => ({ id: item.id, ...item.data() }) as AssassinElimination)
  };
}

export async function claimElimination(groupId: string, killerId: string, victimId: string) {
  const db = getFirebaseFirestore();
  await addDoc(collection(db, ELIMINATIONS), {
    groupId,
    killerId,
    victimId,
    status: "pending",
    createdAt: new Date().toISOString()
  } satisfies Omit<AssassinElimination, "id">);
}

export async function respondElimination(eliminationId: string, accept: boolean) {
  const db = getFirebaseFirestore();
  const eliminationRef = doc(db, ELIMINATIONS, eliminationId);
  const snapshot = await getDoc(eliminationRef);
  const elimination = snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AssassinElimination) : undefined;
  if (!elimination) return;

  await updateDoc(eliminationRef, { status: accept ? "confirmed" : "contested" });
  if (!accept) return;

  const players = await getDocs(query(collection(db, PLAYERS), where("groupId", "==", elimination.groupId)));
  const killer = players.docs.find((item) => item.data().uid === elimination.killerId);
  const victim = players.docs.find((item) => item.data().uid === elimination.victimId);
  const victimTargetId = victim?.data().currentTargetId as string | null;

  if (victim) {
    await updateDoc(doc(db, PLAYERS, victim.id), { isAlive: false, currentTargetId: null });
  }
  if (killer && victimTargetId) {
    await updateDoc(doc(db, PLAYERS, killer.id), {
      currentTargetId: victimTargetId,
      eliminationCount: (killer.data().eliminationCount ?? 0) + 1
    });
    await setDoc(doc(db, MISSIONS, killer.id), {
      groupId: elimination.groupId,
      playerId: elimination.killerId,
      targetId: victimTargetId,
      missionText: defaultMissions[Math.floor(Math.random() * defaultMissions.length)],
      assignedAt: new Date().toISOString()
    }, { merge: true });
  }

  await addDoc(collection(db, ACTIVITY), {
    groupId: elimination.groupId,
    type: "elimination",
    title: "New elimination",
    subtitle: "An assassin strike was confirmed",
    createdAt: new Date().toISOString()
  });
}
