import { describe, expect, it } from "vitest";
import {
  canDeleteGroup,
  canManageGames,
  canManageMembers,
  canManageScores,
  canModeratePhotos,
  resolveEffectiveRole
} from "@/services/permissions";

describe("resolveEffectiveRole", () => {
  it("trusts the member's own role once a membership document exists", () => {
    expect(resolveEffectiveRole({ role: "ADMIN" }, { ownerId: "someone-else" }, "user-1")).toBe("ADMIN");
  });

  it("bootstraps OWNER from the group's ownerId when there's no membership yet", () => {
    expect(resolveEffectiveRole(null, { ownerId: "user-1" }, "user-1")).toBe("OWNER");
  });

  it("bootstraps OWNER from createdBy when there's no membership yet", () => {
    expect(resolveEffectiveRole(null, { createdBy: "user-1" }, "user-1")).toBe("OWNER");
  });

  it("bootstraps OWNER from a case-insensitive ownerEmail match", () => {
    const group = { ownerEmail: "Owner@Example.com" };
    expect(resolveEffectiveRole(null, group, "user-1", "owner@example.com")).toBe("OWNER");
  });

  it("never lets a stale ownerId/ownerEmail override an existing membership role", () => {
    // Regression guard: a plain ADMIN whose uid happens to match a stale ownerId must not be
    // silently promoted back to OWNER — the membership doc's role is authoritative once it exists.
    expect(resolveEffectiveRole({ role: "ADMIN" }, { ownerId: "user-1" }, "user-1")).toBe("ADMIN");
  });

  it("defaults to PLAYER when nothing matches", () => {
    expect(resolveEffectiveRole(null, { ownerId: "someone-else" }, "user-1")).toBe("PLAYER");
    expect(resolveEffectiveRole(undefined, undefined, undefined)).toBe("PLAYER");
  });
});

describe("role permission helpers", () => {
  it("grants score/game/member management to OWNER and ADMIN but not PLAYER", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      expect(canManageScores(role)).toBe(true);
      expect(canManageGames(role)).toBe(true);
      expect(canManageMembers(role)).toBe(true);
    }
    expect(canManageScores("PLAYER")).toBe(false);
    expect(canManageGames("PLAYER")).toBe(false);
    expect(canManageMembers("PLAYER")).toBe(false);
  });

  it("allows photo moderation for OWNER and ADMIN (via manage-games or manage-settings)", () => {
    expect(canModeratePhotos("OWNER")).toBe(true);
    expect(canModeratePhotos("ADMIN")).toBe(true);
    expect(canModeratePhotos("PLAYER")).toBe(false);
  });

  it("allows OWNER and ADMIN to delete the group", () => {
    expect(canDeleteGroup("OWNER")).toBe(true);
    expect(canDeleteGroup("ADMIN")).toBe(true);
    expect(canDeleteGroup("PLAYER")).toBe(false);
  });
});
