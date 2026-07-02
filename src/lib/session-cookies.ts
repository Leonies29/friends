export function setActiveGroupCookie(groupId: string) {
  document.cookie = `istanbul_quest_active_group=${groupId}; path=/; max-age=604800; SameSite=Lax`;
}

export function clearActiveGroupCookie() {
  document.cookie = "istanbul_quest_active_group=; path=/; max-age=0; SameSite=Lax";
}
