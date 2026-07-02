import type { GroupMember, GroupRole, RolePermissions } from "@/types";

export function resolveEffectiveRole(
  member: { role?: GroupRole } | null | undefined,
  group: { ownerId?: string | null; createdBy?: string | null } | null | undefined,
  userId: string | null | undefined
): GroupRole {
  if (userId && group && (group.ownerId === userId || group.createdBy === userId)) {
    return "OWNER";
  }
  if (member?.role === "OWNER" || member?.role === "ADMIN") {
    return member.role;
  }
  if (member?.role) return member.role;
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
    canManageMembers: false,
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
