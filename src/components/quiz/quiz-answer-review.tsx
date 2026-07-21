"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { listQuizQuestions, listUserQuizAnswers } from "@/services/quiz-service";
import type { QuizAnswer, QuizQuestion } from "@/types/quiz";

export function QuizAnswerReview({ groupId, gameId, sessionId }: { groupId: string; gameId: string; sessionId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ answer: QuizAnswer; question: QuizQuestion }>>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      listUserQuizAnswers(sessionId),
      listQuizQuestions(groupId, gameId, true)
    ]).then(([answers, questions]) => {
      if (cancelled) return;
      const questionsById = new Map(questions.map((question) => [question.id, question]));
      const nextRows = answers
        .map((answer) => {
          const question = questionsById.get(answer.questionId);
          return question ? { answer, question } : null;
        })
        .filter((row): row is { answer: QuizAnswer; question: QuizQuestion } => row !== null);
      setRows(nextRows);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [groupId, gameId, sessionId]);

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Loading your answers...</p>
      </Card>
    );
  }

  if (!rows.length) return null;

  return (
    <Card>
      <Badge>Your answers</Badge>
      <div className="mt-4 grid gap-3">
        {rows.map(({ answer, question }) => (
          <div
            key={answer.id}
            className={`rounded-2xl border p-4 ${
              answer.isCorrect
                ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20"
                : "border-rose-200 bg-rose-50/60 dark:bg-rose-950/20"
            }`}
          >
            <p className="font-black">{question.question}</p>
            <p className="mt-2 text-sm">
              Your answer: <span className="font-semibold">{answer.selectedAnswer >= 0 ? question.answers[answer.selectedAnswer] : "No answer"}</span>
            </p>
            {!answer.isCorrect && (
              <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Correct answer: {question.answers[question.correctAnswer]}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
