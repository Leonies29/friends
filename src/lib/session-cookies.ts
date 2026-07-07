export function setActiveGroupCookie(groupId: string) {
  document.cookie = `istanbul_quest_active_group=${groupId}; path=/; max-age=604800; SameSite=Lax`;
}

export function getActiveGroupCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)istanbul_quest_active_group=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function clearActiveGroupCookie() {
  document.cookie = "istanbul_quest_active_group=; path=/; max-age=0; SameSite=Lax";
}
