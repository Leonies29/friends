import { BINGO_CENTER_INDEX, BINGO_GRID_SIZE, BINGO_LINE_BONUS, BINGO_POINTS } from "@/lib/bingo-constants";
import type { BingoCell, BingoChallenge, BingoDifficulty } from "@/types/bingo";

export function pointsForDifficulty(difficulty: BingoDifficulty) {
  return BINGO_POINTS[difficulty];
}

export function indexToRowCol(index: number) {
  return { row: Math.floor(index / BINGO_GRID_SIZE), col: index % BINGO_GRID_SIZE };
}

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function buildFreeCell(index = BINGO_CENTER_INDEX): BingoCell {
  const { row, col } = indexToRowCol(index);
  return {
    index,
    row,
    col,
    challengeId: null,
    title: "FREE",
    description: "Free space — already validated!",
    category: "custom",
    difficulty: "common",
    points: 0,
    isFree: true,
    status: "validated"
  };
}

export function buildChallengeCell(index: number, challenge: BingoChallenge): BingoCell {
  const { row, col } = indexToRowCol(index);
  return {
    index,
    row,
    col,
    challengeId: challenge.id,
    title: challenge.title,
    description: challenge.description,
    category: challenge.category,
    difficulty: challenge.difficulty,
    points: challenge.points,
    isFree: false,
    status: "open",
    submissionId: null
  };
}

export function generatePlayerGrid(challenges: BingoChallenge[]) {
  const active = challenges.filter((challenge) => challenge.active && !challenge.archived);
  if (active.length < 24) {
    throw new Error("At least 24 active challenges are required to start a game.");
  }

  const picked = shuffle(active);
  const cells: BingoCell[] = [];
  let challengeIndex = 0;

  for (let index = 0; index < BINGO_GRID_SIZE * BINGO_GRID_SIZE; index += 1) {
    if (index === BINGO_CENTER_INDEX) {
      cells.push(buildFreeCell(index));
      continue;
    }
    const challenge = picked[challengeIndex % picked.length];
    challengeIndex += 1;
    cells.push(buildChallengeCell(index, challenge));
  }

  return cells;
}

export function isCellValidated(cell: BingoCell) {
  return cell.status === "validated" || Boolean(cell.isFree);
}

export function allLineKeys() {
  const keys: string[] = [];
  for (let row = 0; row < BINGO_GRID_SIZE; row += 1) keys.push(`row-${row}`);
  for (let col = 0; col < BINGO_GRID_SIZE; col += 1) keys.push(`col-${col}`);
  keys.push("diag-main", "diag-anti");
  return keys;
}

export function lineIndexes(lineKey: string) {
  if (lineKey.startsWith("row-")) {
    const row = Number(lineKey.split("-")[1]);
    return Array.from({ length: BINGO_GRID_SIZE }, (_, col) => row * BINGO_GRID_SIZE + col);
  }
  if (lineKey.startsWith("col-")) {
    const col = Number(lineKey.split("-")[1]);
    return Array.from({ length: BINGO_GRID_SIZE }, (_, row) => row * BINGO_GRID_SIZE + col);
  }
  if (lineKey === "diag-main") {
    return Array.from({ length: BINGO_GRID_SIZE }, (_, index) => index * BINGO_GRID_SIZE + index);
  }
  if (lineKey === "diag-anti") {
    return Array.from({ length: BINGO_GRID_SIZE }, (_, index) => index * BINGO_GRID_SIZE + (BINGO_GRID_SIZE - 1 - index));
  }
  return [];
}

export function isLineComplete(cells: BingoCell[], lineKey: string) {
  const indexes = lineIndexes(lineKey);
  return indexes.every((index) => isCellValidated(cells[index]));
}

export function detectNewCompletedLines(cells: BingoCell[], completedLines: string[]) {
  const known = new Set(completedLines);
  return allLineKeys().filter((lineKey) => !known.has(lineKey) && isLineComplete(cells, lineKey));
}

export function countValidatedCells(cells: BingoCell[]) {
  return cells.filter((cell) => isCellValidated(cell)).length;
}

export function bingoBonusPoints(newLines: string[]) {
  return newLines.length * BINGO_LINE_BONUS;
}
