export type QuizCategory = "istanbul" | "turquie";
export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizSettings = {
  questionsPerDay?: number;
  timerSeconds?: number;
  totalSeries?: number;
};

export interface QuizQuestion {
  id: string;
  groupId: string;
  gameId: string;
  question: string;
  answers: [string, string, string, string];
  correctAnswer: number;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  series?: number;
  dayNumber?: number;
  active: boolean;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizSession {
  id: string;
  groupId: string;
  gameId: string;
  userId: string;
  displayName: string;
  questionOrder: string[];
  answeredQuestionIds: string[];
  score: number;
  correctCount: number;
  totalAnswered: number;
  status: "active" | "completed";
  startedAt?: string;
  completedAt?: string | null;
  updatedAt?: string;
}

export interface QuizAnswer {
  id: string;
  groupId: string;
  gameId: string;
  sessionId: string;
  userId: string;
  questionId: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  points: number;
  responseTimeMs: number;
  createdAt?: string;
}

export interface QuizLeaderboardEntry {
  id: string;
  groupId: string;
  gameId: string;
  userId: string;
  displayName: string;
  score: number;
  correctCount: number;
  totalAnswered: number;
  successRate: number;
  updatedAt?: string;
}

export interface ShuffledQuizQuestion {
  question: QuizQuestion;
  shuffledAnswers: [string, string, string, string];
  shuffledCorrectIndex: number;
  shuffleOrder: [number, number, number, number];
}
