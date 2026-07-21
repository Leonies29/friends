import { describe, expect, it } from "vitest";
import {
  bingoBonusPoints,
  countValidatedCells,
  detectNewCompletedLines,
  generatePlayerGrid,
  pointsForDifficulty
} from "@/lib/bingo-logic";
import { BINGO_POINTS } from "@/lib/bingo-constants";
import type { BingoCell, BingoChallenge } from "@/types/bingo";

function buildChallenges(count: number): BingoChallenge[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `challenge-${index}`,
    groupId: "group-1",
    gameId: "game-1",
    title: `Challenge ${index}`,
    description: "Do the thing",
    category: "social",
    difficulty: "common",
    points: 1,
    active: true
  }));
}

describe("pointsForDifficulty", () => {
  it("reads the point value from BINGO_POINTS", () => {
    expect(pointsForDifficulty("common")).toBe(BINGO_POINTS.common);
    expect(pointsForDifficulty("legendary")).toBe(BINGO_POINTS.legendary);
  });
});

describe("generatePlayerGrid", () => {
  it("throws if fewer than 24 active challenges are available", () => {
    expect(() => generatePlayerGrid(buildChallenges(23))).toThrow();
  });

  it("builds a 25-cell grid with a free center cell", () => {
    const cells = generatePlayerGrid(buildChallenges(24));
    expect(cells).toHaveLength(25);
    const center = cells.find((cell) => cell.index === 12);
    expect(center?.isFree).toBe(true);
    expect(center?.status).toBe("validated");
  });

  it("ignores inactive and archived challenges when counting availability", () => {
    const challenges = [
      ...buildChallenges(24),
      { ...buildChallenges(1)[0], id: "inactive", active: false },
      { ...buildChallenges(1)[0], id: "archived", archived: true }
    ];
    expect(() => generatePlayerGrid(challenges)).not.toThrow();
  });
});

describe("countValidatedCells and detectNewCompletedLines", () => {
  function buildGrid(): BingoCell[] {
    return generatePlayerGrid(buildChallenges(24));
  }

  it("counts only the free cell as validated on a fresh grid", () => {
    expect(countValidatedCells(buildGrid())).toBe(1);
  });

  it("detects a newly completed line once every cell in it is validated", () => {
    const cells = buildGrid();
    // Row 0 is cells at index 0-4.
    for (let index = 0; index < 5; index += 1) {
      cells[index].status = "validated";
    }
    const newLines = detectNewCompletedLines(cells, []);
    expect(newLines).toContain("row-0");
  });

  it("does not re-report a line that's already known as completed", () => {
    const cells = buildGrid();
    for (let index = 0; index < 5; index += 1) {
      cells[index].status = "validated";
    }
    const newLines = detectNewCompletedLines(cells, ["row-0"]);
    expect(newLines).not.toContain("row-0");
  });
});

describe("bingoBonusPoints", () => {
  it("is 0 with no new lines", () => {
    expect(bingoBonusPoints([])).toBe(0);
  });

  it("scales with the number of newly completed lines", () => {
    expect(bingoBonusPoints(["row-0", "col-1"])).toBe(20);
  });
});
