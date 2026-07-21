import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { memberUserId, type GameMemberLike } from "@/lib/game-members";
import type { GameTeamMembership, Team, XpTransaction } from "@/types";

export const TEAMS_COLLECTION = "teams";
export const GAME_TEAM_MEMBERSHIPS_COLLECTION = "gameTeamMemberships";

function membershipId(groupId: string, gameId: string, userId: string) {
  return `${groupId}_${gameId}_${userId}`;
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function listTeams(groupId: string, gameId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(
    collection(db, TEAMS_COLLECTION),
    where("groupId", "==", groupId),
    where("gameId", "==", gameId)
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Team);
}

export async function createTeam(groupId: string, gameId: string, name: string, color?: string) {
  const db = getFirebaseFirestore();
  const id = `${groupId}_${gameId}_${Date.now()}`;
  await setDoc(doc(db, TEAMS_COLLECTION, id), {
    id,
    groupId,
    gameId,
    name,
    ...(color ? { color } : {}),
    createdAt: serverTimestamp()
  });
  return id;
}

export async function renameTeam(teamId: string, name: string) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, TEAMS_COLLECTION, teamId), { name, updatedAt: serverTimestamp() }, { merge: true });
}

// Deleting a team must also clear it off every membership still pointing at it — otherwise those
// point at a team that no longer exists, the same orphan-assignment problem a group reset
// already guards against for the teams/gameTeamMemberships collections themselves.
export async function deleteTeam(groupId: string, gameId: string, teamId: string) {
  const db = getFirebaseFirestore();
  const membershipsSnapshot = await getDocs(query(
    collection(db, GAME_TEAM_MEMBERSHIPS_COLLECTION),
    where("groupId", "==", groupId),
    where("gameId", "==", gameId),
    where("teamId", "==", teamId)
  ));

  const batch = writeBatch(db);
  membershipsSnapshot.docs.forEach((item) => {
    batch.update(item.ref, { teamId: null, updatedAt: serverTimestamp() });
  });
  await batch.commit();

  await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
}

export async function getGameTeamMembership(groupId: string, gameId: string, userId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, GAME_TEAM_MEMBERSHIPS_COLLECTION, membershipId(groupId, gameId, userId)));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as GameTeamMembership) : null;
}

export async function listGameTeamMemberships(groupId: string, gameId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(
    collection(db, GAME_TEAM_MEMBERSHIPS_COLLECTION),
    where("groupId", "==", groupId),
    where("gameId", "==", gameId)
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as GameTeamMembership);
}

// Used by awardGameXp to fan XP out to every member sharing this player's team in this game.
export async function listGameTeamMembers(groupId: string, gameId: string, teamId: string) {
  const memberships = await listGameTeamMemberships(groupId, gameId);
  return memberships.filter((item) => item.teamId === teamId).map((item) => item.userId);
}

export async function setMemberTeamForGame(groupId: string, gameId: string, userId: string, teamId: string | null) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, GAME_TEAM_MEMBERSHIPS_COLLECTION, membershipId(groupId, gameId, userId)), {
    groupId,
    gameId,
    userId,
    teamId,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export type ShuffleMode = "fill-gaps" | "reshuffle-all";

// Random distribution across existing teams for this game. "fill-gaps" only touches members with
// no membership doc yet (a late joiner, or a game that just switched into team mode) so it never
// disturbs teams the admin already formed; "reshuffle-all" redraws everyone from scratch.
export async function shuffleTeamsIntoMembers(
  groupId: string,
  gameId: string,
  members: GameMemberLike[],
  existingMemberships: GameTeamMembership[],
  teamIds: string[],
  mode: ShuffleMode
) {
  if (!teamIds.length) {
    throw new Error("Create at least one team before shuffling.");
  }

  const assignedUserIds = new Set(existingMemberships.filter((item) => item.teamId).map((item) => item.userId));
  const eligible = mode === "fill-gaps" ? members.filter((member) => !assignedUserIds.has(memberUserId(member))) : members;
  if (!eligible.length) return;

  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  shuffle(eligible).forEach((member, index) => {
    const userId = memberUserId(member);
    const teamId = teamIds[index % teamIds.length];
    batch.set(doc(db, GAME_TEAM_MEMBERSHIPS_COLLECTION, membershipId(groupId, gameId, userId)), {
      groupId,
      gameId,
      userId,
      teamId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
}

// Aggregates XP per team for one game from already-loaded transactions/memberships (no extra
// Firestore reads). Deliberately not filtered to active-only members — a deactivated player's
// past XP must stay in their team's total even though they drop out of the individual leaderboard.
export function getTeamXpTotalsForGame(gameId: string, memberships: GameTeamMembership[], transactions: XpTransaction[]) {
  const gameTransactions = transactions.filter((item) => item.gameId === gameId);
  const totals = new Map<string, number>();
  memberships.forEach((membership) => {
    if (!membership.teamId) return;
    const memberXp = gameTransactions
      .filter((item) => item.userId === membership.userId)
      .reduce((sum, item) => sum + item.amount, 0);
    totals.set(membership.teamId, (totals.get(membership.teamId) ?? 0) + memberXp);
  });
  return totals;
}
