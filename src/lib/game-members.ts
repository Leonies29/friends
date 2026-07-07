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
  return member.userId || member.id;
}
