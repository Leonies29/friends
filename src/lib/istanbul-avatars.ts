import type { ActiveGroup } from "@/hooks/use-active-group";

import { appPath } from "@/lib/app-paths";

function publicAsset(path: string) {
  return appPath(path.startsWith("/") ? path : `/${path}`);
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const ISTANBUL_AVATAR_FILES: Record<string, string> = {
  leonie: "leonie.png",
  keira: "keira.png",
  marko: "marko.png",
  noah: "noah.png",
  yaman: "yaman.png"
};

export function isIstanbulGroup(group: Pick<ActiveGroup, "name" | "destination" | "id"> | null | undefined) {
  if (!group) return false;
  const label = `${group.name ?? ""} ${group.destination ?? ""} ${group.id ?? ""}`.toLowerCase();
  return label.includes("istanbul");
}

export function getIstanbulAvatarUrl(member: {
  nickname?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  const candidates = [member.nickname, member.username, member.email?.split("@")[0]].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const key = normalizeName(candidate);
    const file = ISTANBUL_AVATAR_FILES[key];
    if (file) return publicAsset(`/avatars/istanbul/${file}`);
  }

  for (const candidate of candidates) {
    const key = normalizeName(candidate);
    for (const [name, file] of Object.entries(ISTANBUL_AVATAR_FILES)) {
      if (key.includes(name) || name.includes(key)) {
        return publicAsset(`/avatars/istanbul/${file}`);
      }
    }
  }

  return null;
}

export function resolveMemberAvatar(
  group: Pick<ActiveGroup, "name" | "destination" | "id"> | null | undefined,
  member: {
    nickname?: string | null;
    username?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  }
) {
  if (isIstanbulGroup(group)) {
    return getIstanbulAvatarUrl(member) ?? member.avatarUrl ?? "";
  }
  return member.avatarUrl ?? "";
}

export const ISTANBUL_GROUP_MEMBERS = Object.keys(ISTANBUL_AVATAR_FILES);
