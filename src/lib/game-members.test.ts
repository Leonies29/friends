import { describe, expect, it } from "vitest";
import { filterActiveGameMembers, isActiveGameMember, memberUserId } from "@/lib/game-members";

describe("isActiveGameMember", () => {
  it("treats a missing status as active", () => {
    expect(isActiveGameMember({ id: "m1" })).toBe(true);
  });

  it("is true only for status active", () => {
    expect(isActiveGameMember({ id: "m1", status: "active" })).toBe(true);
    expect(isActiveGameMember({ id: "m1", status: "inactive" })).toBe(false);
    expect(isActiveGameMember({ id: "m1", status: "removed" })).toBe(false);
    expect(isActiveGameMember({ id: "m1", status: "pending" })).toBe(false);
  });
});

describe("filterActiveGameMembers", () => {
  it("keeps only active members", () => {
    const members = [
      { id: "a", status: "active" as const },
      { id: "b", status: "inactive" as const },
      { id: "c" }
    ];
    expect(filterActiveGameMembers(members).map((m) => m.id)).toEqual(["a", "c"]);
  });
});

describe("memberUserId", () => {
  it("prefers the explicit userId field", () => {
    expect(memberUserId({ id: "group1_user1", userId: "user1" })).toBe("user1");
  });

  it("extracts the userId from a groupId_userId composite doc id", () => {
    expect(memberUserId({ id: "group1_user1" })).toBe("user1");
  });

  it("falls back to the raw id when it isn't a composite id", () => {
    expect(memberUserId({ id: "user1" })).toBe("user1");
  });

  it("trims whitespace on the userId field", () => {
    expect(memberUserId({ id: "group1_user1", userId: "  user1  " })).toBe("user1");
  });
});
