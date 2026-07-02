export function getAppBasePath() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/friends")) {
    return "/friends";
  }
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

function usesTrailingSlash() {
  return Boolean(getAppBasePath());
}

export function appPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const queryIndex = normalized.indexOf("?");
  const pathname = queryIndex === -1 ? normalized : normalized.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : normalized.slice(queryIndex);
  const base = getAppBasePath();
  const slashPath = usesTrailingSlash() && pathname !== "/" && !pathname.endsWith("/")
    ? `${pathname}/`
    : pathname;

  return `${base}${slashPath}${query}`;
}

export function buildInviteLink(inviteCode: string) {
  const path = appPath(`/join?inviteCode=${encodeURIComponent(inviteCode.trim())}`);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function buildJoinPath(inviteCode: string) {
  return appPath(`/join?inviteCode=${encodeURIComponent(inviteCode.trim())}`);
}
