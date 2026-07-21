import { describe, expect, it } from "vitest";
import { nextQuestionId, scoreQuizAnswer, shuffleQuestion, successRate } from "@/lib/quiz-logic";
import { QUIZ_BASE_POINTS, QUIZ_SPEED_BONUS, QUIZ_TIMER_SECONDS } from "@/lib/quiz-seed";
import type { QuizQuestion } from "@/types/quiz";

describe("scoreQuizAnswer", () => {
  it("scores 0 for a wrong answer regardless of speed", () => {
    expect(scoreQuizAnswer(false, 100)).toBe(0);
  });

  it("awards the speed bonus when answered within the timer", () => {
    expect(scoreQuizAnswer(true, 1000, 20)).toBe(QUIZ_BASE_POINTS + QUIZ_SPEED_BONUS);
  });

  it("awards only the base points when answered after the timer", () => {
    expect(scoreQuizAnswer(true, 25000, 20)).toBe(QUIZ_BASE_POINTS);
  });

  it("uses the default timer when none is provided", () => {
    expect(scoreQuizAnswer(true, 0)).toBe(QUIZ_BASE_POINTS + QUIZ_SPEED_BONUS);
    expect(scoreQuizAnswer(true, (QUIZ_TIMER_SECONDS + 5) * 1000)).toBe(QUIZ_BASE_POINTS);
  });
});

describe("successRate", () => {
  it("is 0 when nothing has been answered", () => {
    expect(successRate(0, 0)).toBe(0);
  });

  it("rounds to the nearest percent", () => {
    expect(successRate(1, 3)).toBe(33);
    expect(successRate(2, 3)).toBe(67);
  });
});

describe("nextQuestionId", () => {
  it("returns the first question not yet answered", () => {
    expect(nextQuestionId(["q1", "q2", "q3"], ["q1"])).toBe("q2");
  });

  it("returns null once every question has been answered", () => {
    expect(nextQuestionId(["q1", "q2"], ["q1", "q2"])).toBeNull();
  });
});

describe("shuffleQuestion", () => {
  it("keeps all four answers but tracks the shuffled position of the correct one", () => {
    const question: QuizQuestion = {
      id: "q1",
      groupId: "group-1",
      gameId: "game-1",
      question: "What year?",
      answers: ["A", "B", "C", "D"],
      correctAnswer: 2,
      category: "istanbul",
      difficulty: "easy",
      active: true
    };
    const shuffled = shuffleQuestion(question);
    expect(shuffled.shuffledAnswers).toHaveLength(4);
    expect(new Set(shuffled.shuffledAnswers)).toEqual(new Set(question.answers));
    expect(shuffled.shuffledAnswers[shuffled.shuffledCorrectIndex]).toBe(question.answers[question.correctAnswer]);
  });
});
