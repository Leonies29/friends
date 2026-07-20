import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { pickRandomTemplate, ensureMissionLibrary } from "@/services/assassin-mission-library-service";
import { getAssassinSetup, validateAssignments } from "@/services/assassin-setup-service";
import { addXpTransaction } from "@/services/xp-service";
import { getAssassinMissionRewards, getAssassinVictoryReward } from "@/lib/assassin-progression";
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

export async function createSetupGame(groupId: string, mode: AssassinSetupMode, startingLives = 5) {
  const db = getFirebaseFirestore();
  const existing = await getDocs(query(collection(db, GAMES), where("groupId", "==", groupId)));
  if (existing.docs[0]) {
    await updateDoc(doc(db, GAMES, existing.docs[0].id), {
      status: "setup",
      setupMode: mode,
      phase: "normal",
      winnerId: null,
      startingLives,
      updatedAt: serverTimestamp()
    });
    return existing.docs[0].id;
  }

  const created = await addDoc(collection(db, GAMES), {
    groupId,
    status: "setup",
    setupMode: mode,
    phase: "normal",
    startingLives
  } satisfies Omit<AssassinGame, "id">);
  return created.id;
}

export async function updateAssassinGameSettings(groupId: string, settings: { startingLives?: number }) {
  const db = getFirebaseFirestore();
  const gameDoc = await getDocs(query(collection(db, GAMES), where("groupId", "==", groupId)));
  if (!gameDoc.docs[0]) return;
  await updateDoc(doc(db, GAMES, gameDoc.docs[0].id), {
    ...settings,
    updatedAt: serverTimestamp()
  });
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
  const isDuelStart = members.length === 2;
  const startingLives = state.game?.startingLives ?? 5;

  await updateDoc(doc(db, GAMES, gameId), {
    status: "active",
    setupMode: setup.mode,
    phase: isDuelStart ? "duel" : "normal",
    winnerId: null,
    startingLives,
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
        eliminationCount: 0,
        lives: startingLives,
        maxLives: startingLives,
        assassinPoints: 0,
        missionsCompleted: 0,
        victories: 0,
        currentStreak: 0,
        bestStreak: 0,
        xpEarned: 0,
        lastCompletedAt: null
      } satisfies Omit<AssassinPlayer, "id">),
      setDoc(doc(db, MISSIONS, playerDocId), {
        groupId,
        playerId: member.id,
        targetId: assignment.targetId,
        missionText: assignment.missionText,
        templateId: assignment.templateId ?? null,
        difficulty: "Easy",
        xpReward: 10,
        assassinPointsReward: 10,
        status: "active",
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
    ...games.docs.map((item) => updateDoc(doc(db, GAMES, item.id), {
      status: "setup",
      phase: "normal",
      winnerId: null,
      updatedAt: serverTimestamp()
    })),
    ...players.docs.map((item) => deleteDoc(doc(db, PLAYERS, item.id))),
    ...missions.docs.map((item) => deleteDoc(doc(db, MISSIONS, item.id))),
    ...eliminations.docs.map((item) => deleteDoc(doc(db, ELIMINATIONS, item.id)))
  ]);
}

async function randomMissionText(groupId: string) {
  const templates = await ensureMissionLibrary(groupId);
  return pickRandomTemplate(templates)?.text ?? "Complete your secret mission with your target.";
}

function asPlayers(docs: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }): AssassinPlayer[] {
  return docs.docs.map((item) => ({ id: item.id, ...item.data() }) as AssassinPlayer);
}

function resolveNextAliveTarget(
  startId: string | null,
  excludeIds: Set<string>,
  players: AssassinPlayer[]
): string | null {
  if (!startId) return null;
  let current: string | null = startId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    const target = players.find((player) => player.uid === current);
    if (!target) return null;
    if (target.isAlive && !excludeIds.has(current)) return current;
    current = target.currentTargetId;
  }
  return null;
}

async function assignMission(groupId: string, playerId: string, targetId: string) {
  const db = getFirebaseFirestore();
  const playerDocId = `${groupId}_${playerId}`;
  const templates = await ensureMissionLibrary(groupId);
  const template = pickRandomTemplate(templates);
  const rewards = getAssassinMissionRewards(template?.difficulty ?? "Easy");
  await setDoc(doc(db, MISSIONS, playerDocId), {
    groupId,
    playerId,
    targetId,
    missionText: template?.text ?? await randomMissionText(groupId),
    templateId: template?.id ?? null,
    difficulty: template?.difficulty ?? "Easy",
    xpReward: template?.xpReward ?? rewards.xpReward,
    assassinPointsReward: template?.assassinPointsReward ?? rewards.assassinPointsReward,
    status: "active",
    skipped: false,
    assignedAt: new Date().toISOString()
  }, { merge: true });
}

async function enterDuelPhase(groupId: string, gameId: string, survivors: AssassinPlayer[]) {
  if (survivors.length !== 2) return;
  const db = getFirebaseFirestore();
  const [playerA, playerB] = survivors;

  await updateDoc(doc(db, GAMES, gameId), { phase: "duel", updatedAt: serverTimestamp() });
  await Promise.all([
    updateDoc(doc(db, PLAYERS, playerA.id), { currentTargetId: playerB.uid }),
    updateDoc(doc(db, PLAYERS, playerB.id), { currentTargetId: playerA.uid }),
    assignMission(groupId, playerA.uid, playerB.uid),
    assignMission(groupId, playerB.uid, playerA.uid)
  ]);
}

async function checkAndUpdateGamePhase(groupId: string) {
  const state = await loadAssassinState(groupId);
  const game = state.game;
  if (!game || game.status !== "active") return;

  const survivors = state.players.filter((player) => player.isAlive);
  const db = getFirebaseFirestore();

  if (survivors.length === 1) {
    const winner = survivors[0];
    const victoryReward = getAssassinVictoryReward();
    await Promise.all([
      updateDoc(doc(db, GAMES, game.id), {
        status: "finished",
        phase: "normal",
        winnerId: winner.uid,
        endedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      }),
      updateDoc(doc(db, PLAYERS, `${groupId}_${winner.uid}`), {
        victories: (winner.victories ?? 0) + 1,
        assassinPoints: (winner.assassinPoints ?? 0) + victoryReward.assassinPointsReward
      })
    ]);
    return;
  }

  if (survivors.length === 2 && game.phase !== "duel") {
    await enterDuelPhase(groupId, game.id, survivors);
  }
}

async function applyConfirmedElimination(elimination: AssassinElimination) {
  const db = getFirebaseFirestore();
  const playerDocs = await getDocs(query(collection(db, PLAYERS), where("groupId", "==", elimination.groupId)));
  let players = asPlayers(playerDocs);
  const killer = players.find((player) => player.uid === elimination.killerId);
  const victim = players.find((player) => player.uid === elimination.victimId);

  if (!killer || !victim) {
    throw new Error("Unable to apply elimination: player not found.");
  }
  if (!victim.isAlive) {
    throw new Error("This target was already eliminated.");
  }

  const victimTargetId = victim.currentTargetId;
  const nextLives = Math.max(0, (victim.lives ?? victim.maxLives ?? 0) - 1);
  const victimPlayerRef = doc(db, PLAYERS, victim.id);
  await updateDoc(victimPlayerRef, {
    isAlive: nextLives > 0 ? true : false,
    currentTargetId: nextLives > 0 ? victim.currentTargetId : null,
    lives: nextLives,
    lastCompletedAt: null
  });

  players = players.map((player) =>
    player.uid === elimination.victimId ? { ...player, isAlive: nextLives > 0 ? true : false, currentTargetId: nextLives > 0 ? victim.currentTargetId : null, lives: nextLives } : player
  );

  const excludeIds = new Set([elimination.killerId, elimination.victimId]);
  const nextTargetId = resolveNextAliveTarget(victimTargetId, excludeIds, players);

  if (killer.isAlive) {
    const killerRef = doc(db, PLAYERS, killer.id);
    const killerMissionRef = doc(db, MISSIONS, `${elimination.groupId}_${elimination.killerId}`);
    const killerMissionSnapshot = await getDoc(killerMissionRef);
    const killerMission = killerMissionSnapshot.exists() ? (killerMissionSnapshot.data() as Partial<AssassinMission>) : null;
    const killerNextLives = Math.max(0, killer.lives ?? killer.maxLives ?? 0);
    const missionReward = Number(killerMission?.assassinPointsReward ?? 10);
    const missionXpReward = Number(killerMission?.xpReward ?? 10);
    const rewardPoints = 100 + missionReward;
    const rewardXp = 100 + missionXpReward;
    await Promise.all([
      updateDoc(killerRef, {
        currentTargetId: nextTargetId,
        eliminationCount: (killer.eliminationCount ?? 0) + 1,
        assassinPoints: (killer.assassinPoints ?? 0) + rewardPoints,
        missionsCompleted: (killer.missionsCompleted ?? 0) + 1,
        xpEarned: (killer.xpEarned ?? 0) + rewardXp,
        currentStreak: (killer.currentStreak ?? 0) + 1,
        bestStreak: Math.max(killer.bestStreak ?? 0, (killer.currentStreak ?? 0) + 1),
        lives: killerNextLives
      }),
      updateDoc(killerMissionRef, {
        status: "completed",
        completedAt: new Date().toISOString()
      })
    ]);
    await addXpTransaction({
      groupId: elimination.groupId,
      userId: elimination.killerId,
      amount: rewardXp,
      sourceType: "game",
      sourceId: elimination.id,
      reason: "Mission and elimination completed",
      createdBy: elimination.killerId
    });
    if (nextTargetId) {
      await assignMission(elimination.groupId, elimination.killerId, nextTargetId);
    }
  }

  const stranded = players.filter(
    (player) =>
      player.isAlive &&
      player.uid !== elimination.killerId &&
      player.currentTargetId === elimination.victimId
  );

  await Promise.all(stranded.map(async (player) => {
    const newTarget = resolveNextAliveTarget(victimTargetId, new Set([player.uid, elimination.victimId]), players);
    await updateDoc(doc(db, PLAYERS, player.id), { currentTargetId: newTarget });
    if (newTarget) {
      await assignMission(elimination.groupId, player.uid, newTarget);
    }
  }));

  await addDoc(collection(db, ACTIVITY), {
    groupId: elimination.groupId,
    type: "elimination",
    title: "New elimination",
    subtitle: "An assassin strike was confirmed",
    createdAt: new Date().toISOString()
  });

  await checkAndUpdateGamePhase(elimination.groupId);
}

export async function claimElimination(groupId: string, killerId: string, victimId: string) {
  const state = await loadAssassinState(groupId);
  const game = state.game;

  if (!game || game.status !== "active") {
    throw new Error("The game is not active.");
  }

  const killer = state.players.find((player) => player.uid === killerId);
  const victim = state.players.find((player) => player.uid === victimId);

  if (!killer?.isAlive) {
    throw new Error("You are not alive.");
  }
  if (!victim?.isAlive) {
    throw new Error("This target is already eliminated.");
  }
  if (killer.currentTargetId !== victimId) {
    throw new Error("This person is not your current target.");
  }
  if (killerId === victimId) {
    throw new Error("You cannot eliminate yourself.");
  }

  const pendingForKiller = state.eliminations.some(
    (item) => item.killerId === killerId && item.status === "pending"
  );
  if (pendingForKiller) {
    throw new Error("You already have an elimination pending confirmation.");
  }

  const pendingForVictim = state.eliminations.some(
    (item) => item.victimId === victimId && (item.status === "pending" || item.status === "contested")
  );
  if (pendingForVictim) {
    throw new Error("This target already has an elimination in progress.");
  }

  const db = getFirebaseFirestore();
  await addDoc(collection(db, ELIMINATIONS), {
    groupId,
    killerId,
    victimId,
    status: "pending",
    createdAt: new Date().toISOString()
  } satisfies Omit<AssassinElimination, "id">);
}

export async function respondElimination(eliminationId: string, accept: boolean, callerId: string) {
  const db = getFirebaseFirestore();
  const eliminationRef = doc(db, ELIMINATIONS, eliminationId);
  const snapshot = await getDoc(eliminationRef);
  const elimination = snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AssassinElimination) : undefined;

  if (!elimination) {
    throw new Error("Elimination not found.");
  }
  if (elimination.status !== "pending") {
    throw new Error("This elimination has already been handled.");
  }
  if (elimination.victimId !== callerId) {
    throw new Error("Only the targeted player can confirm or contest this elimination.");
  }

  if (!accept) {
    await updateDoc(eliminationRef, {
      status: "contested",
      resolvedAt: new Date().toISOString()
    });
    return;
  }

  await updateDoc(eliminationRef, {
    status: "confirmed",
    resolvedAt: new Date().toISOString()
  });
  await applyConfirmedElimination(elimination);
}

export async function resolveContestedElimination(eliminationId: string, adminConfirms: boolean, callerId: string) {
  const db = getFirebaseFirestore();
  const eliminationRef = doc(db, ELIMINATIONS, eliminationId);
  const snapshot = await getDoc(eliminationRef);
  const elimination = snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AssassinElimination) : undefined;

  if (!elimination) {
    throw new Error("Elimination not found.");
  }
  if (elimination.status !== "contested") {
    throw new Error("This elimination is not awaiting admin review.");
  }

  const { canManageGames, resolveEffectiveRole } = await import("@/services/permissions");
  const { getGroupMember } = await import("@/services/member-service");
  const { doc: groupDoc, getDoc: readDoc } = await import("firebase/firestore");
  const groupSnapshot = await readDoc(groupDoc(db, "friendGroups", elimination.groupId));
  const groupData = groupSnapshot.exists() ? groupSnapshot.data() : null;
  const membership = await getGroupMember(elimination.groupId, callerId);
  const role = resolveEffectiveRole(membership, groupData as { ownerId?: string; createdBy?: string } | null, callerId);
  if (!canManageGames(role)) {
    throw new Error("Only an admin can resolve contested eliminations.");
  }

  if (!adminConfirms) {
    await updateDoc(eliminationRef, {
      status: "rejected",
      resolvedAt: new Date().toISOString()
    });
    return;
  }

  await updateDoc(eliminationRef, {
    status: "confirmed",
    resolvedAt: new Date().toISOString()
  });
  await applyConfirmedElimination(elimination);
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

export async function suspendAssassinPlayer(groupId: string, userId: string) {
  const db = getFirebaseFirestore();
  const playerRef = doc(db, PLAYERS, `${groupId}_${userId}`);
  const snapshot = await getDoc(playerRef);
  if (!snapshot.exists()) return;

  await updateDoc(playerRef, {
    isAlive: false,
    currentTargetId: null,
    suspended: true,
    updatedAt: serverTimestamp()
  });
}
