import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { pickRandomTemplate, ensureMissionLibrary } from "@/services/assassin-mission-library-service";
import { getAssassinSetup, validateAssignments } from "@/services/assassin-setup-service";
import type { AssassinElimination, AssassinGame, AssassinMission, AssassinPlayer, AssassinSetupMode } from "@/types/game";

const GAMES = "assassinGames";
const PLAYERS = "assassinPlayers";
const MISSIONS = "assassinMissions";
const ELIMINATIONS = "assassinEliminations";
const ACTIVITY = "activityFeed";

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

export async function createSetupGame(groupId: string, mode: AssassinSetupMode) {
  const db = getFirebaseFirestore();
  const existing = await getDocs(query(collection(db, GAMES), where("groupId", "==", groupId)));
  if (existing.docs[0]) {
    await updateDoc(doc(db, GAMES, existing.docs[0].id), {
      status: "setup",
      setupMode: mode,
      updatedAt: serverTimestamp()
    });
    return existing.docs[0].id;
  }

  const created = await addDoc(collection(db, GAMES), {
    groupId,
    status: "setup",
    setupMode: mode
  } satisfies Omit<AssassinGame, "id">);
  return created.id;
}

export async function startAssassinGame(groupId: string, members: Array<{ id: string; username: string; avatarUrl?: string | null }>) {
  const setup = await getAssassinSetup(groupId);
  if (!setup?.assignments?.length) {
    throw new Error("Configure assignments before starting the game.");
  }

  const error = validateAssignments(
    members.map((member) => ({ id: member.id, name: member.username })),
    setup.assignments
  );
  if (error) throw new Error(error);

  const db = getFirebaseFirestore();
  const state = await loadAssassinState(groupId);
  const gameId = state.game?.id ?? (await createSetupGame(groupId, setup.mode));

  await updateDoc(doc(db, GAMES, gameId), {
    status: "active",
    setupMode: setup.mode,
    startedAt: new Date().toISOString(),
    updatedAt: serverTimestamp()
  });

  await Promise.all(members.map((member) => {
    const assignment = setup.assignments.find((item) => item.playerId === member.id);
    if (!assignment) return Promise.resolve();
    const playerDocId = `${groupId}_${member.id}`;
    return Promise.all([
      setDoc(doc(db, PLAYERS, playerDocId), {
        groupId,
        uid: member.id,
        displayName: member.username,
        avatarUrl: member.avatarUrl ?? "",
        isAlive: true,
        currentTargetId: assignment.targetId,
        eliminationCount: 0
      } satisfies Omit<AssassinPlayer, "id">),
      setDoc(doc(db, MISSIONS, playerDocId), {
        groupId,
        playerId: member.id,
        targetId: assignment.targetId,
        missionText: assignment.missionText,
        templateId: assignment.templateId ?? null,
        skipped: false,
        assignedAt: new Date().toISOString()
      } satisfies Omit<AssassinMission, "id">)
    ]);
  }));

  return loadAssassinState(groupId);
}

export async function resetAssassinGame(groupId: string) {
  const db = getFirebaseFirestore();
  const [games, players, missions, eliminations] = await Promise.all([
    getDocs(query(collection(db, GAMES), where("groupId", "==", groupId))),
    getDocs(query(collection(db, PLAYERS), where("groupId", "==", groupId))),
    getDocs(query(collection(db, MISSIONS), where("groupId", "==", groupId))),
    getDocs(query(collection(db, ELIMINATIONS), where("groupId", "==", groupId)))
  ]);

  await Promise.all([
    ...games.docs.map((item) => updateDoc(doc(db, GAMES, item.id), { status: "setup", updatedAt: serverTimestamp() })),
    ...players.docs.map((item) => deleteDoc(doc(db, PLAYERS, item.id))),
    ...missions.docs.map((item) => deleteDoc(doc(db, MISSIONS, item.id))),
    ...eliminations.docs.map((item) => deleteDoc(doc(db, ELIMINATIONS, item.id)))
  ]);
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

async function randomMissionText(groupId: string) {
  const templates = await ensureMissionLibrary(groupId);
  return pickRandomTemplate(templates)?.text ?? "Complete your secret mission with your target.";
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
      missionText: await randomMissionText(elimination.groupId),
      skipped: false,
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

export async function emergencyChangeTarget(groupId: string, playerId: string, targetId: string, missionText?: string) {
  const db = getFirebaseFirestore();
  const playerDocId = `${groupId}_${playerId}`;
  await updateDoc(doc(db, PLAYERS, playerDocId), { currentTargetId: targetId });
  await setDoc(doc(db, MISSIONS, playerDocId), {
    groupId,
    playerId,
    targetId,
    missionText: missionText ?? await randomMissionText(groupId),
    skipped: false,
    assignedAt: new Date().toISOString()
  }, { merge: true });
}

export async function emergencyChangeMission(groupId: string, playerId: string, missionText: string) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, MISSIONS, `${groupId}_${playerId}`), {
    missionText,
    skipped: false,
    assignedAt: new Date().toISOString()
  }, { merge: true });
}

export async function emergencySkipMission(groupId: string, playerId: string) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, MISSIONS, `${groupId}_${playerId}`), {
    skipped: true,
    missionText: "Mission skipped by admin.",
    assignedAt: new Date().toISOString()
  }, { merge: true });
}

export async function emergencyReplaceMission(groupId: string, playerId: string) {
  const missionText = await randomMissionText(groupId);
  await emergencyChangeMission(groupId, playerId, missionText);
  return missionText;
}
