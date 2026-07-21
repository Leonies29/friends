"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { QuizLeaderboardPanel } from "@/components/quiz/quiz-leaderboard-panel";
import { QuizProgressBar } from "@/components/quiz/quiz-progress-bar";
import { QuizQuestionCard } from "@/components/quiz/quiz-question-card";
import { QuizResultsScreen } from "@/components/quiz/quiz-results-screen";
import { QuizAnswerReview } from "@/components/quiz/quiz-answer-review";
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
  const [ready, setReady] = useState(false);

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
          displayName,
          currentDay: state.group?.currentDay ?? 1,
          questionsPerDay: activeQuiz.settings?.questionsPerDay
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
      setReady(false);
      await loadQuestion(playerSession);
      // Arriving on the page (or coming back to it) must not start the countdown by itself —
      // wait for the player to confirm they're ready via the Start button below.
      setTimerActive(false);
    }
    setLoading(false);
  }, [state.group, state.userId, displayName, loadQuestion]);

  function handleStart() {
    setReady(true);
    setTimerActive(true);
  }

  useEffect(() => { void load(); }, [load]);

  const timerSeconds = quizGame?.settings?.timerSeconds ?? 20;

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
      responseTimeMs,
      timerSeconds
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
  }, [session, current, locked, getElapsedMs, load, loadQuestion, timerSeconds]);

  const handleTimeout = useCallback(() => {
    if (!locked) void submitAnswer(null);
  }, [locked, submitAnswer]);

  const remaining = useQuizTimer(timerActive && !locked, handleTimeout, timerSeconds);

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
        {session && quizGame.settings?.answersRevealed && (
          <QuizAnswerReview groupId={state.group.id} gameId={quizGame.id} sessionId={session.id} />
        )}
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="History Quiz" title={quizGame.title} description={`Answer within ${timerSeconds}s for a +${QUIZ_SPEED_BONUS} speed bonus · +${QUIZ_BASE_POINTS} pts per correct answer`} group={state.group}>
      {session && (
        <QuizProgressBar current={session.answeredQuestionIds.length} total={session.questionOrder.length} />
      )}

      <Card className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-emerald-50 p-2 text-center sm:p-3">
          <p className="text-[10px] font-black uppercase text-emerald-700 sm:text-xs">Correct</p>
          <p className="text-lg font-black text-emerald-900 sm:text-2xl">+{QUIZ_BASE_POINTS}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-2 text-center sm:p-3">
          <p className="text-[10px] font-black uppercase text-amber-700 sm:text-xs">Speed</p>
          <p className="text-lg font-black text-amber-900 sm:text-2xl">+{QUIZ_SPEED_BONUS}</p>
        </div>
        <div className="rounded-2xl bg-sky-50 p-2 text-center sm:p-3">
          <p className="text-[10px] font-black uppercase text-sky-700 sm:text-xs">Score</p>
          <p className="text-lg font-black text-sky-900 sm:text-2xl">{session?.score ?? 0}</p>
        </div>
      </Card>

      {current && !ready && (
        <Card className="text-center">
          <Badge>How to play</Badge>
          <h2 className="mt-3 text-2xl font-black">Ready for the quiz?</h2>
          <ul className="mx-auto mt-4 grid max-w-sm gap-2 text-left text-sm text-muted-foreground">
            <li>⏱️ You have {timerSeconds} seconds to answer each question.</li>
            <li>⭐ +{QUIZ_BASE_POINTS} points for every correct answer.</li>
            <li>⚡ +{QUIZ_SPEED_BONUS} speed bonus if you answer within the time limit.</li>
            <li>🚫 No answer or running out of time counts as wrong.</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">The timer starts as soon as you hit Start.</p>
          <Button className="mt-5" onClick={handleStart}>Start quiz</Button>
        </Card>
      )}

      {current && ready && (
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
