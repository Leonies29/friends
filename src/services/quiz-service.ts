import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { ISTANBUL_HISTORY_QUIZ_SEED } from "@/lib/quiz-seed";
import { scoreQuizAnswer, shuffle, successRate } from "@/lib/quiz-logic";
import { addXpTransaction } from "@/services/xp-service";
import type {
  QuizAnswer,
  QuizCategory,
  QuizDifficulty,
  QuizLeaderboardEntry,
  QuizQuestion,
  QuizSession
} from "@/types/quiz";

export const QUIZ_QUESTIONS = "quizQuestions";
export const QUIZ_SESSIONS = "quizSessions";
export const QUIZ_ANSWERS = "quizAnswers";
export const QUIZ_LEADERBOARD = "quizLeaderboard";

function sessionDocId(groupId: string, gameId: string, userId: string) {
  return `${groupId}_${gameId}_${userId}`;
}

function leaderboardDocId(groupId: string, gameId: string, userId: string) {
  return `${groupId}_${gameId}_${userId}`;
}

export async function ensureQuizQuestions(groupId: string, gameId: string) {
  const existing = await listQuizQuestions(groupId, gameId, true);
  if (existing.length) return existing.filter((question) => !question.archived);

  await importQuizQuestions(groupId, gameId, ISTANBUL_HISTORY_QUIZ_SEED);
  return listQuizQuestions(groupId, gameId);
}

export async function listQuizQuestions(groupId: string, gameId: string, includeArchived = false) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(
    collection(db, QUIZ_QUESTIONS),
    where("groupId", "==", groupId),
    where("gameId", "==", gameId)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as QuizQuestion)
    .filter((question) => includeArchived || !question.archived)
    .sort((a, b) => a.question.localeCompare(b.question));
}

export async function importQuizQuestions(
  groupId: string,
  gameId: string,
  questions = ISTANBUL_HISTORY_QUIZ_SEED,
  replace = false
) {
  const db = getFirebaseFirestore();
  if (replace) {
    const existing = await listQuizQuestions(groupId, gameId, true);
    await Promise.all(existing.map((question) =>
      updateDoc(doc(db, QUIZ_QUESTIONS, question.id), { archived: true, active: false, updatedAt: serverTimestamp() })
    ));
  }

  const batch = writeBatch(db);
  questions.forEach((template, index) => {
    const id = `${groupId}_${gameId}_seed_${Date.now()}_${index}`;
    batch.set(doc(db, QUIZ_QUESTIONS, id), {
      groupId,
      gameId,
      question: template.question,
      answers: template.answers,
      correctAnswer: template.correctAnswer,
      category: template.category,
      difficulty: template.difficulty,
      active: true,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
}

export async function createQuizQuestion(groupId: string, gameId: string, input: {
  question: string;
  answers: [string, string, string, string];
  correctAnswer: number;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  active?: boolean;
}) {
  const db = getFirebaseFirestore();
  const created = await addDoc(collection(db, QUIZ_QUESTIONS), {
    groupId,
    gameId,
    question: input.question,
    answers: input.answers,
    correctAnswer: input.correctAnswer,
    category: input.category,
    difficulty: input.difficulty,
    active: input.active ?? true,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return created.id;
}

export async function updateQuizQuestion(questionId: string, data: Partial<Pick<QuizQuestion, "question" | "answers" | "correctAnswer" | "category" | "difficulty" | "active">>) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, QUIZ_QUESTIONS, questionId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteQuizQuestion(questionId: string) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, QUIZ_QUESTIONS, questionId), { archived: true, active: false, updatedAt: serverTimestamp() });
}

export async function getQuizSession(groupId: string, gameId: string, userId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, QUIZ_SESSIONS, sessionDocId(groupId, gameId, userId)));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as QuizSession) : null;
}

export async function getOrCreateQuizSession(input: {
  groupId: string;
  gameId: string;
  userId: string;
  displayName: string;
}) {
  const existing = await getQuizSession(input.groupId, input.gameId, input.userId);
  if (existing) return existing;

  const questions = (await listQuizQuestions(input.groupId, input.gameId)).filter((question) => question.active);
  if (!questions.length) throw new Error("No active questions found for this quiz.");

  const questionOrder = shuffle(questions.map((question) => question.id));
  const db = getFirebaseFirestore();
  const session: Omit<QuizSession, "id"> = {
    groupId: input.groupId,
    gameId: input.gameId,
    userId: input.userId,
    displayName: input.displayName,
    questionOrder,
    answeredQuestionIds: [],
    score: 0,
    correctCount: 0,
    totalAnswered: 0,
    status: "active",
    startedAt: new Date().toISOString(),
    completedAt: null,
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, QUIZ_SESSIONS, sessionDocId(input.groupId, input.gameId, input.userId)), {
    ...session,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await setDoc(doc(db, QUIZ_LEADERBOARD, leaderboardDocId(input.groupId, input.gameId, input.userId)), {
    groupId: input.groupId,
    gameId: input.gameId,
    userId: input.userId,
    displayName: input.displayName,
    score: 0,
    correctCount: 0,
    totalAnswered: 0,
    successRate: 0,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return { id: sessionDocId(input.groupId, input.gameId, input.userId), ...session } as QuizSession;
}

export async function getQuizQuestion(questionId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, QUIZ_QUESTIONS, questionId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as QuizQuestion) : null;
}

export async function submitQuizAnswer(input: {
  session: QuizSession;
  question: QuizQuestion;
  selectedAnswer: number;
  responseTimeMs: number;
}) {
  if (input.session.answeredQuestionIds.includes(input.question.id)) {
    throw new Error("You have already answered this question.");
  }

  const isCorrect = input.selectedAnswer >= 0
    && input.selectedAnswer <= 3
    && input.selectedAnswer === input.question.correctAnswer;
  const points = scoreQuizAnswer(isCorrect, input.responseTimeMs);
  const db = getFirebaseFirestore();

  await addDoc(collection(db, QUIZ_ANSWERS), {
    groupId: input.session.groupId,
    gameId: input.session.gameId,
    sessionId: input.session.id,
    userId: input.session.userId,
    questionId: input.question.id,
    selectedAnswer: input.selectedAnswer,
    correctAnswer: input.question.correctAnswer,
    isCorrect,
    points,
    responseTimeMs: input.responseTimeMs,
    createdAt: serverTimestamp()
  });

  const answeredQuestionIds = [...input.session.answeredQuestionIds, input.question.id];
  const score = input.session.score + points;
  const correctCount = input.session.correctCount + (isCorrect ? 1 : 0);
  const totalAnswered = input.session.totalAnswered + 1;
  const completed = answeredQuestionIds.length >= input.session.questionOrder.length;
  const rate = successRate(correctCount, totalAnswered);

  await updateDoc(doc(db, QUIZ_SESSIONS, input.session.id), {
    answeredQuestionIds,
    score,
    correctCount,
    totalAnswered,
    status: completed ? "completed" : "active",
    completedAt: completed ? new Date().toISOString() : null,
    updatedAt: serverTimestamp()
  });

  await setDoc(doc(db, QUIZ_LEADERBOARD, leaderboardDocId(input.session.groupId, input.session.gameId, input.session.userId)), {
    groupId: input.session.groupId,
    gameId: input.session.gameId,
    userId: input.session.userId,
    displayName: input.session.displayName,
    score,
    correctCount,
    totalAnswered,
    successRate: rate,
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (points > 0) {
    await addXpTransaction({
      groupId: input.session.groupId,
      userId: input.session.userId,
      amount: points,
      sourceType: "game",
      sourceId: input.question.id,
      reason: isCorrect && points > 10 ? `Speed bonus quiz (+${points} pts)` : `Correct quiz answer (+${points} pts)`,
      createdBy: input.session.userId
    });
  }

  return { isCorrect, points, completed, score, correctCount, totalAnswered, successRate: rate };
}

export async function listQuizLeaderboard(groupId: string, gameId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(
    collection(db, QUIZ_LEADERBOARD),
    where("groupId", "==", groupId),
    where("gameId", "==", gameId)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as QuizLeaderboardEntry)
    .sort((a, b) => b.score - a.score || b.correctCount - a.correctCount || b.successRate - a.successRate);
}

export async function listUserQuizAnswers(sessionId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, QUIZ_ANSWERS), where("sessionId", "==", sessionId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as QuizAnswer);
}
