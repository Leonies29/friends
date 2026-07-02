"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { QUIZ_CATEGORY_META, QUIZ_DIFFICULTY_META } from "@/lib/quiz-seed";
import {
  createQuizQuestion,
  deleteQuizQuestion,
  ensureQuizQuestions,
  importQuizQuestions,
  listQuizQuestions,
  updateQuizQuestion
} from "@/services/quiz-service";
import type { Game } from "@/types";
import type { QuizCategory, QuizDifficulty, QuizQuestion } from "@/types/quiz";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function QuizSetupPanel({ game, groupId }: { game: Game; groupId: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
      difficulty: String(form.get("difficulty") ?? "easy") as QuizDifficulty
    });
    event.currentTarget.reset();
    setMessage("Question ajoutée.");
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement des questions...</p>;

  return (
    <div className="grid gap-4">
      {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}

      <Card className="p-4">
        <Badge>Import</Badge>
        <p className="mt-2 text-sm text-muted-foreground">Recharge les 30 questions historiques d'Istanbul et de Turquie.</p>
        <Button className="mt-3" size="sm" variant="secondary" onClick={() => void importQuizQuestions(groupId, game.id, undefined, true).then(() => { setMessage("30 questions importées."); return load(); })}>
          📥 Importer les 30 questions
        </Button>
      </Card>

      <form className="grid gap-2 rounded-2xl border border-border bg-background p-4" onSubmit={(event) => void handleAdd(event)}>
        <Badge>Ajouter une question</Badge>
        <textarea name="question" required placeholder="Question" className={`${inputClass} min-h-20`} />
        <input name="answerA" required placeholder="Réponse A" className={inputClass} />
        <input name="answerB" required placeholder="Réponse B" className={inputClass} />
        <input name="answerC" required placeholder="Réponse C" className={inputClass} />
        <input name="answerD" required placeholder="Réponse D" className={inputClass} />
        <div className="grid gap-2 md:grid-cols-3">
          <select name="correctAnswer" className={inputClass} defaultValue="0">
            <option value="0">Bonne réponse : A</option>
            <option value="1">Bonne réponse : B</option>
            <option value="2">Bonne réponse : C</option>
            <option value="3">Bonne réponse : D</option>
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
        <Button type="submit" size="sm">➕ Ajouter</Button>
      </form>

      <div className="grid gap-2">
        <p className="text-sm font-black">{questions.filter((q) => q.active).length} questions actives · {questions.length} total</p>
        {questions.map((question) => (
          <div key={question.id} className="rounded-2xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Badge>{QUIZ_CATEGORY_META[question.category].emoji}</Badge>
                  <Badge>{QUIZ_DIFFICULTY_META[question.difficulty].emoji}</Badge>
                  {!question.active && <Badge>Inactif</Badge>}
                </div>
                <p className="mt-2 font-black">{question.question}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ✅ {question.answers[question.correctAnswer]}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Modifier" onClick={() => {
                  const text = window.prompt("Question", question.question);
                  if (!text) return;
                  void updateQuizQuestion(question.id, { question: text }).then(load);
                }}>✏️</button>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Activer/Désactiver" onClick={() => void updateQuizQuestion(question.id, { active: !question.active }).then(load)}>
                  {question.active ? "⏸️" : "▶️"}
                </button>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-border" title="Supprimer" onClick={() => void deleteQuizQuestion(question.id).then(load)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
