import { describe, expect, it } from "vitest";
import { calculateLevel, getLevelProgress, readinessPercent } from "@/lib/utils";

describe("calculateLevel", () => {
  it("starts at level 1 with no XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("levels up every 500 XP", () => {
    expect(calculateLevel(499)).toBe(1);
    expect(calculateLevel(500)).toBe(2);
    expect(calculateLevel(1999)).toBe(4);
  });
});

describe("getLevelProgress", () => {
  it("is 0% at the start of a level", () => {
    expect(getLevelProgress(0)).toBe(0);
    expect(getLevelProgress(500)).toBe(0);
  });

  it("is 50% halfway through a level", () => {
    expect(getLevelProgress(250)).toBe(50);
  });
});

describe("readinessPercent", () => {
  it("is 0 when there are no entries", () => {
    expect(readinessPercent({})).toBe(0);
  });

  it("computes the share of ready members", () => {
    expect(readinessPercent({ a: "ready", b: "ready", c: "not-ready", d: "not-ready" })).toBe(50);
  });

  it("is 100 when everyone is ready", () => {
    expect(readinessPercent({ a: "ready", b: "ready" })).toBe(100);
  });
});
