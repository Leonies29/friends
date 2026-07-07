export type GameMemberLike = {
  id: string;
  userId?: string;
  status?: "pending" | "active" | "inactive" | "removed";
};

export function isActiveGameMember(member: GameMemberLike) {
  const status = member.status ?? "active";
  return status === "active";
}

export function filterActiveGameMembers<T extends GameMemberLike>(members: T[]) {
  return members.filter(isActiveGameMember);
}

export function memberUserId(member: GameMemberLike) {
  const userId = member.userId?.trim();
  if (userId) return userId;
  const memberDocId = member.id?.trim() ?? "";
  const separatorIndex = memberDocId.indexOf("_");
  if (separatorIndex > 0 && separatorIndex < memberDocId.length - 1) {
    return memberDocId.slice(separatorIndex + 1);
  }
  return memberDocId;
}
