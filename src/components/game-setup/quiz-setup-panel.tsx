"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { QUIZ_CATEGORY_META, QUIZ_DIFFICULTY_META } from "@/lib/quiz-seed";
import {
  createQuizQuestion,
  deleteQuizQuestion,
  ensureQuizQuestions,
  importQuizQuestions,
  updateQuizQuestion
} from "@/services/quiz-service";
import { updateGame } from "@/services/game-service";
import type { Game } from "@/types";
import type { QuizCategory, QuizDifficulty, QuizQuestion } from "@/types/quiz";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function QuizSetupPanel({ game, groupId }: { game: Game; groupId: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");

  const [questionsPerDay, setQuestionsPerDay] = useState(String(game.settings?.questionsPerDay ?? 3));
  const [timerSeconds, setTimerSeconds] = useState(String(game.settings?.timerSeconds ?? 20));
  const [totalSeries, setTotalSeries] = useState(String(game.settings?.totalSeries ?? 3));

  async function saveSettings() {
    await updateGame(game.id, {
      settings: {
        ...game.settings,
        questionsPerDay: Number(questionsPerDay) || 3,
        timerSeconds: Number(timerSeconds) || 20,
        totalSeries: Number(totalSeries) || 3
      }
    });
    setMessage("Quiz settings saved.");
  }

  async function load() {
    setLoading(true);
    setQuestions(await ensureQuizQuestions(groupId, game.id));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [groupId, game.id]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const answers = [
      String(form.get("answerA") ?? ""),
      String(form.get("answerB") ?? ""),
      String(form.get("answerC") ?? ""),
      String(form.get("answerD") ?? "")
    ] as [string, string, string, string];
    await createQuizQuestion(groupId, game.id, {
      question: String(form.get("question") ?? ""),
      answers,
      correctAnswer: Number(form.get("correctAnswer") ?? 0),
      category: String(form.get("category") ?? "istanbul") as QuizCategory,
      difficulty: String(form.get("difficulty") ?? "easy") as QuizDifficulty,
      series: Number(form.get("series") ?? 1),
      dayNumber: Number(form.get("dayNumber") ?? 1)
    });
    event.currentTarget.reset();
    setMessage("Question added.");
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading questions...</p>;

  return (
    <div className="grid gap-4">
      {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}

      <Card className="p-4">
        <Badge>Quiz settings</Badge>
        <p className="mt-2 text-sm text-muted-foreground">Organize questions by day and series. Players get questions for the current trip day.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold text-muted-foreground">
            Questions / day
            <input className={inputClass} value={questionsPerDay} onChange={(event) => setQuestionsPerDay(event.target.value)} type="number" min={1} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-muted-foreground">
            Timer (seconds)
            <input className={inputClass} value={timerSeconds} onChange={(event) => setTimerSeconds(event.target.value)} type="number" min={5} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-muted-foreground">
            Series count
            <input className={inputClass} value={totalSeries} onChange={(event) => setTotalSeries(event.target.value)} type="number" min={1} />
          </label>
        </div>
        <Button className="mt-3" size="sm" variant="secondary" onClick={() => void saveSettings()}>Save settings</Button>
      </Card>

      <Card className="p-4">
        <Badge>Import</Badge>
        <p className="mt-2 text-sm text-muted-foreground">Reload all 30 curated questions on Istanbul and Turkish history.</p>
        <Button className="mt-3" size="sm" variant="secondary" onClick={() => void importQuizQuestions(groupId, game.id, undefined, true).then(() => { setMessage("30 questions imported."); return load(); })}>
          📥 Import 30 questions
        </Button>
      </Card>

      <form className="grid gap-2 rounded-2xl border border-border bg-background p-4" onSubmit={(event) => void handleAdd(event)}>
        <Badge>Add a question</Badge>
        <textarea name="question" required placeholder="Question" className={`${inputClass} min-h-20`} />
        <input name="answerA" required placeholder="Answer A" className={inputClass} />
        <input name="answerB" required placeholder="Answer B" className={inputClass} />
        <input name="answerC" required placeholder="Answer C" className={inputClass} />
        <input name="answerD" required placeholder="Answer D" className={inputClass} />
        <div className="grid gap-2 md:grid-cols-5">
          <input name="series" type="number" min={1} defaultValue={1} placeholder="Series" className={inputClass} />
          <input name="dayNumber" type="number" min={1} defaultValue={1} placeholder="Day" className={inputClass} />
          <select name="correctAnswer" className={inputClass} defaultValue="0">
            <option value="0">Correct answer: A</option>
            <option value="1">Correct answer: B</option>
            <option value="2">Correct answer: C</option>
            <option value="3">Correct answer: D</option>
          </select>
          <select name="category" className={inputClass}>
            {Object.entries(QUIZ_CATEGORY_META).map(([key, value]) => (
              <option key={key} value={key}>{value.emoji} {value.label}</option>
            ))}
          </select>
          <select name="difficulty" className={inputClass}>
            {Object.entries(QUIZ_DIFFICULTY_META).map(([key, value]) => (
              <option key={key} value={key}>{value.emoji} {value.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">➕ Add</Button>
      </form>

      <div className="grid gap-2">
        <p className="text-sm font-black">{questions.filter((q) => q.active).length} active questions · {questions.length} total</p>
        {questions.map((question) => (
          <div key={question.id} className="rounded-2xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Badge>{QUIZ_CATEGORY_META[question.category].emoji} {QUIZ_CATEGORY_META[question.category].label}</Badge>
                  <Badge>{QUIZ_DIFFICULTY_META[question.difficulty].emoji} {QUIZ_DIFFICULTY_META[question.difficulty].label}</Badge>
                  {!question.active && <Badge>Inactive</Badge>}
                </div>
                {editingQuestionId === question.id ? (
                  <input value={editQuestionText} onChange={(event) => setEditQuestionText(event.target.value)} placeholder="Question" className={`${inputClass} mt-2`} />
                ) : (
                  <p className="mt-2 font-black">{question.question}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  ✅ {question.answers[question.correctAnswer]}
                </p>
              </div>
              <div className="flex gap-1">
                {editingQuestionId === question.id ? (
                  <>
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Save" onClick={() => {
                      if (!editQuestionText.trim()) return;
                      void updateQuizQuestion(question.id, { question: editQuestionText.trim() }).then(load);
                      setEditingQuestionId(null);
                    }}>✅</button>
                    <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Cancel" onClick={() => setEditingQuestionId(null)}>✖️</button>
                  </>
                ) : (
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Edit" onClick={() => {
                    setEditingQuestionId(question.id);
                    setEditQuestionText(question.question);
                  }}>✏️</button>
                )}
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Enable / disable" onClick={() => void updateQuizQuestion(question.id, { active: !question.active }).then(load)}>
                  {question.active ? "⏸️" : "▶️"}
                </button>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Delete" onClick={() => void deleteQuizQuestion(question.id).then(load)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
