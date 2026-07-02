"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { QuizLeaderboardPanel } from "@/components/quiz/quiz-leaderboard-panel";
import { QuizProgressBar } from "@/components/quiz/quiz-progress-bar";
import { QuizQuestionCard } from "@/components/quiz/quiz-question-card";
import { QuizResultsScreen } from "@/components/quiz/quiz-results-screen";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";
import { useActiveGroup } from "@/hooks/use-active-group";
import { useQuizResponseTimer, useQuizTimer } from "@/hooks/use-quiz-timer";
import { nextQuestionId, shuffleQuestion } from "@/lib/quiz-logic";
import { QUIZ_BASE_POINTS, QUIZ_SPEED_BONUS } from "@/lib/quiz-seed";
import { listGames } from "@/services/game-service";
import {
  getOrCreateQuizSession,
  getQuizQuestion,
  getQuizSession,
  listQuizLeaderboard,
  submitQuizAnswer
} from "@/services/quiz-service";
import type { Game } from "@/types";
import type { QuizSession, ShuffledQuizQuestion } from "@/types/quiz";

type Feedback = { isCorrect: boolean; correctLabel: string; points: number };

export function QuizPage() {
  const state = useActiveGroup();
  const [quizGame, setQuizGame] = useState<Game | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [current, setCurrent] = useState<ShuffledQuizQuestion | null>(null);
  const [leaderboard, setLeaderboard] = useState<Awaited<ReturnType<typeof listQuizLeaderboard>>>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  const displayName = useMemo(
    () => state.currentMember?.nickname || state.currentMember?.username || "Player",
    [state.currentMember]
  );

  const getElapsedMs = useQuizResponseTimer(timerActive && Boolean(current) && !locked);

  const loadQuestion = useCallback(async (activeSession: QuizSession) => {
    const questionId = nextQuestionId(activeSession.questionOrder, activeSession.answeredQuestionIds);
    if (!questionId) {
      setCurrent(null);
      setTimerActive(false);
      return;
    }
    const question = await getQuizQuestion(questionId);
    if (!question) return;
    setCurrent(shuffleQuestion(question));
    setFeedback(null);
    setLocked(false);
    setTimerActive(true);
  }, []);

  const load = useCallback(async () => {
    if (!state.group?.id || !state.userId) return;
    setLoading(true);
    const games = await listGames(state.group.id);
    const activeQuiz = games.find((game) => game.category === "quiz" && game.enabled && game.visible && !game.archived) ?? null;
    setQuizGame(activeQuiz);

    if (!activeQuiz) {
      setSession(null);
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    const [playerSession, ranking] = await Promise.all([
      getQuizSession(state.group!.id, activeQuiz.id, state.userId).then(async (existing) =>
        existing ?? getOrCreateQuizSession({
          groupId: state.group!.id,
          gameId: activeQuiz.id,
          userId: state.userId!,
          displayName
        })
      ),
      listQuizLeaderboard(state.group!.id, activeQuiz.id)
    ]);

    setSession(playerSession);
    setLeaderboard(ranking);
    if (playerSession.status === "completed") {
      setCurrent(null);
      setTimerActive(false);
    } else {
      await loadQuestion(playerSession);
    }
    setLoading(false);
  }, [state.group?.id, state.userId, displayName, loadQuestion]);

  useEffect(() => { void load(); }, [load]);

  const submitAnswer = useCallback(async (displayedIndex: number | null) => {
    if (!session || !current || locked) return;
    setLocked(true);
    setTimerActive(false);

    const originalIndex = displayedIndex === null ? -1 : current.shuffleOrder[displayedIndex];
    const responseTimeMs = getElapsedMs();
    const result = await submitQuizAnswer({
      session,
      question: current.question,
      selectedAnswer: originalIndex,
      responseTimeMs
    });

    const correctLabel = current.question.answers[current.question.correctAnswer];
    setFeedback({ isCorrect: result.isCorrect, correctLabel, points: result.points });

    const updatedSession = {
      ...session,
      answeredQuestionIds: [...session.answeredQuestionIds, current.question.id],
      score: result.score,
      correctCount: result.correctCount,
      totalAnswered: result.totalAnswered,
      status: result.completed ? "completed" as const : "active" as const,
      completedAt: result.completed ? new Date().toISOString() : null
    };
    setSession(updatedSession);

    window.setTimeout(async () => {
      if (result.completed) {
        setCurrent(null);
        await load();
      } else {
        await loadQuestion(updatedSession);
      }
    }, 1800);
  }, [session, current, locked, getElapsedMs, load, loadQuestion]);

  const handleTimeout = useCallback(() => {
    if (!locked) void submitAnswer(null);
  }, [locked, submitAnswer]);

  const remaining = useQuizTimer(timerActive && !locked, handleTimeout);

  if (state.loading || loading) return <LoadingCard label="Loading quiz..." />;
  if (!state.group) return <EmptyGroupCard />;

  if (!quizGame) {
    return (
      <PageShell eyebrow="History Quiz" title="Istanbul & Turkey" description="This quiz is not enabled for your trip yet." group={state.group}>
        <Card><p className="text-sm text-muted-foreground">Ask an admin to enable the quiz under Admin → Games.</p></Card>
      </PageShell>
    );
  }

  if (session?.status === "completed" || (session && !current && !timerActive)) {
    return (
      <PageShell eyebrow="History Quiz" title={quizGame.title} description="Discover the story of Istanbul and Turkey" group={state.group}>
        {session && !showLeaderboard && <QuizResultsScreen session={session} onReplayLeaderboard={() => setShowLeaderboard(true)} />}
        {(showLeaderboard || !session) && <QuizLeaderboardPanel entries={leaderboard} />}
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="History Quiz" title={quizGame.title} description="Answer within 20s for a +5 speed bonus · +10 pts per correct answer" group={state.group}>
      {session && (
        <QuizProgressBar current={session.answeredQuestionIds.length} total={session.questionOrder.length} />
      )}

      <Card className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-50 p-3 text-center">
          <p className="text-xs font-black uppercase text-emerald-700">Correct answer</p>
          <p className="text-2xl font-black text-emerald-900">+{QUIZ_BASE_POINTS}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-3 text-center">
          <p className="text-xs font-black uppercase text-amber-700">Speed bonus</p>
          <p className="text-2xl font-black text-amber-900">+{QUIZ_SPEED_BONUS}</p>
        </div>
        <div className="rounded-2xl bg-sky-50 p-3 text-center">
          <p className="text-xs font-black uppercase text-sky-700">Your score</p>
          <p className="text-2xl font-black text-sky-900">{session?.score ?? 0}</p>
        </div>
      </Card>

      {current && (
        <QuizQuestionCard
          item={current}
          remainingSeconds={remaining}
          locked={locked}
          feedback={feedback}
          onSelect={(index) => void submitAnswer(index)}
        />
      )}

      <QuizLeaderboardPanel entries={leaderboard} />
    </PageShell>
  );
}
