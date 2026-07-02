export const GAMES_UPDATED_EVENT = "istanbul:games-updated";

export function notifyGamesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GAMES_UPDATED_EVENT));
}
