import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { ensureMissionLibrary, pickRandomTemplate } from "@/services/assassin-mission-library-service";
import type { AssassinAssignmentDraft, AssassinSetupDoc, AssassinSetupMode } from "@/types/game";

export const SETUPS = "assassinSetups";

export type AssassinMember = { id: string; name: string; avatarUrl?: string | null };

function memberName(member: AssassinMember) {
  return member.name;
}

export function buildCycle(members: AssassinMember[], order?: string[]) {
  const ids = order?.length === members.length ? order : members.map((member) => member.id);
  const byId = new Map(members.map((member) => [member.id, member]));
  return ids.map((playerId, index) => {
    const player = byId.get(playerId)!;
    const targetId = ids[(index + 1) % ids.length];
    const target = byId.get(targetId)!;
    return {
      playerId: player.id,
      playerName: memberName(player),
      targetId: target.id,
      targetName: memberName(target),
      missionText: "",
      templateId: null,
      locked: false
    } satisfies AssassinAssignmentDraft;
  });
}

export function validateAssignments(members: AssassinMember[], assignments: AssassinAssignmentDraft[]) {
  if (assignments.length !== members.length) {
    return "Every player needs exactly one target.";
  }

  const memberIds = new Set(members.map((member) => member.id));
  const targets = new Set<string>();
  const sources = new Set<string>();

  for (const assignment of assignments) {
    if (!memberIds.has(assignment.playerId) || !memberIds.has(assignment.targetId)) {
      return "Invalid player or target in assignment.";
    }
    if (assignment.playerId === assignment.targetId) {
      return "A player cannot target themselves.";
    }
    if (!assignment.missionText.trim()) {
      return `Mission missing for ${assignment.playerName}.`;
    }
    targets.add(assignment.targetId);
    sources.add(assignment.playerId);
  }

  if (targets.size !== members.length || sources.size !== members.length) {
    return "Assignments must form a complete circle where everyone has one target and is targeted once.";
  }

  let current: string | null | undefined = assignments[0]?.playerId;
  const visited = new Set<string>();
  for (let step = 0; step < members.length; step += 1) {
    if (!current || visited.has(current)) return "Assignments must form one single assassination circle.";
    visited.add(current);
    current = assignments.find((item) => item.playerId === current)?.targetId ?? null;
  }

  if (visited.size !== members.length) {
    return "Assignments must form one single assassination circle.";
  }

  return null;
}

export async function getAssassinSetup(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, SETUPS, groupId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AssassinSetupDoc) : null;
}

export async function saveAssassinSetup(groupId: string, mode: AssassinSetupMode, assignments: AssassinAssignmentDraft[]) {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, SETUPS, groupId), {
    groupId,
    mode,
    assignments,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function generateRandomSetup(groupId: string, members: AssassinMember[], mode: AssassinSetupMode = "random", previous?: AssassinAssignmentDraft[]) {
  const templates = await ensureMissionLibrary(groupId);
  const shuffled = [...members].sort(() => Math.random() - 0.5);
  const cycle = buildCycle(shuffled);
  const lockedByPlayer = new Map((previous ?? []).filter((item) => item.locked).map((item) => [item.playerId, item]));

  const assignments = cycle.map((assignment) => {
    const locked = lockedByPlayer.get(assignment.playerId);
    if (locked?.locked) {
      const template = pickRandomTemplate(templates);
      return {
        ...assignment,
        missionText: locked.missionText || template?.text || "Complete your secret mission with your target.",
        templateId: locked.templateId ?? template?.id ?? null,
        locked: true
      };
    }
    const template = pickRandomTemplate(templates);
    return {
      ...assignment,
      missionText: template?.text ?? "Complete your secret mission with your target.",
      templateId: template?.id ?? null,
      locked: false
    };
  });

  await saveAssassinSetup(groupId, mode, assignments);
  return assignments;
}

export async function saveDesignerSetup(groupId: string, assignments: AssassinAssignmentDraft[], mode: AssassinSetupMode = "designer") {
  await saveAssassinSetup(groupId, mode, assignments);
  return assignments;
}

export function applyDragTarget(assignments: AssassinAssignmentDraft[], playerId: string, targetId: string, members: AssassinMember[]) {
  const target = members.find((member) => member.id === targetId);
  if (!target) return assignments;
  return assignments.map((assignment) => assignment.playerId === playerId
    ? { ...assignment, targetId: target.id, targetName: memberName(target) }
    : assignment);
}
