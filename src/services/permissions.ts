import type { GroupMember, GroupRole, RolePermissions } from "@/types";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function resolveEffectiveRole(
  member: { role?: GroupRole } | null | undefined,
  group: { ownerId?: string | null; createdBy?: string | null; ownerEmail?: string | null } | null | undefined,
  userId: string | null | undefined,
  email?: string | null
): GroupRole {
  // The role stored on the member's own groupMembers document is the source of truth once it
  // exists (it reflects promotions, demotions and ownership transfers). The group document's
  // ownerId/createdBy/ownerEmail fields are only a bootstrap signal for members who don't have a
  // membership record yet — they must never override an already-established role, otherwise an
  // admin who happens to still match a stale owner field would keep getting bumped back to OWNER.
  if (member?.role) {
    return member.role;
  }
  if (userId && group) {
    if (group.ownerId === userId || group.createdBy === userId) {
      return "OWNER";
    }
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail && normalizeEmail(group.ownerEmail) === normalizedEmail) {
      return "OWNER";
    }
  }
  return "PLAYER";
}

export const rolePermissions: Record<GroupRole, RolePermissions> = {
  OWNER: {
    canDeleteGroup: true,
    canManageSettings: true,
    canManageMembers: true,
    canManageGames: true,
    canManageScores: true,
    canManagePlanning: true,
    canUploadPhotos: true,
    canViewRankings: true
  },
  ADMIN: {
    canDeleteGroup: false,
    canManageSettings: false,
    canManageMembers: true,
    canManageGames: true,
    canManageScores: true,
    canManagePlanning: true,
    canUploadPhotos: true,
    canViewRankings: true
  },
  PLAYER: {
    canDeleteGroup: false,
    canManageSettings: false,
    canManageMembers: false,
    canManageGames: false,
    canManageScores: false,
    canManagePlanning: false,
    canUploadPhotos: true,
    canViewRankings: true
  }
};

export function getRolePermissions(role: GroupRole = "PLAYER") {
  return rolePermissions[role];
}

export function canDeleteGroup(role?: GroupRole) {
  return getRolePermissions(role).canDeleteGroup;
}

export function canManageMembers(role?: GroupRole) {
  return getRolePermissions(role).canManageMembers;
}

export function canManageGames(role?: GroupRole) {
  return getRolePermissions(role).canManageGames;
}

export function canManageScores(role?: GroupRole) {
  return getRolePermissions(role).canManageScores;
}

export function canManagePlanning(role?: GroupRole) {
  return getRolePermissions(role).canManagePlanning;
}

export function canModeratePhotos(role?: GroupRole) {
  const permissions = getRolePermissions(role);
  return permissions.canManageGames || permissions.canManageSettings;
}

export function getMemberRole(
  member: { role?: GroupRole } | null | undefined,
  group?: { ownerId?: string | null; createdBy?: string | null } | null,
  userId?: string | null
): GroupRole {
  return resolveEffectiveRole(member, group, userId);
}
