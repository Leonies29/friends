import type { QuizQuestion, ShuffledQuizQuestion } from "@/types/quiz";
import { QUIZ_BASE_POINTS, QUIZ_SPEED_BONUS, QUIZ_TIMER_SECONDS } from "@/lib/quiz-seed";

export { QUIZ_BASE_POINTS, QUIZ_SPEED_BONUS, QUIZ_TIMER_SECONDS };

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function shuffleQuestion(question: QuizQuestion): ShuffledQuizQuestion {
  const order = shuffle([0, 1, 2, 3]) as [number, number, number, number];
  const shuffledAnswers = order.map((index) => question.answers[index]) as [string, string, string, string];
  const shuffledCorrectIndex = order.indexOf(question.correctAnswer);
  return { question, shuffledAnswers, shuffledCorrectIndex, shuffleOrder: order };
}

export function scoreQuizAnswer(isCorrect: boolean, responseTimeMs: number) {
  if (!isCorrect) return 0;
  const speedBonus = responseTimeMs <= QUIZ_TIMER_SECONDS * 1000 ? QUIZ_SPEED_BONUS : 0;
  return QUIZ_BASE_POINTS + speedBonus;
}

export function successRate(correctCount: number, totalAnswered: number) {
  if (!totalAnswered) return 0;
  return Math.round((correctCount / totalAnswered) * 100);
}

export function nextQuestionId(sessionQuestionOrder: string[], answeredQuestionIds: string[]) {
  const answered = new Set(answeredQuestionIds);
  return sessionQuestionOrder.find((questionId) => !answered.has(questionId)) ?? null;
}
