export function getAppBasePath() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/friends")) {
    return "/friends";
  }
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

export function appPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBasePath()}${normalized}`;
}

export function buildInviteLink(inviteCode: string) {
  const path = appPath(`/join?inviteCode=${encodeURIComponent(inviteCode.trim())}`);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function buildJoinPath(inviteCode: string) {
  return appPath(`/join?inviteCode=${encodeURIComponent(inviteCode.trim())}`);
}
