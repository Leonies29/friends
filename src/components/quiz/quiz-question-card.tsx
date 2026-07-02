"use client";

import { motion } from "framer-motion";
import { Badge, Button } from "@/components/ui";
import { QUIZ_CATEGORY_META, QUIZ_DIFFICULTY_META } from "@/lib/quiz-seed";
import type { ShuffledQuizQuestion } from "@/types/quiz";

export function QuizQuestionCard({
  item,
  remainingSeconds,
  locked,
  feedback,
  onSelect
}: {
  item: ShuffledQuizQuestion;
  remainingSeconds: number;
  locked: boolean;
  feedback?: { isCorrect: boolean; correctLabel: string; points: number } | null;
  onSelect: (displayedIndex: number) => void;
}) {
  const category = QUIZ_CATEGORY_META[item.question.category];
  const difficulty = QUIZ_DIFFICULTY_META[item.question.difficulty];
  const urgent = remainingSeconds <= 5;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.5rem] border border-border bg-background p-4 shadow-sm sm:rounded-[2rem] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{category.emoji} {category.label}</Badge>
          <Badge className="border-border bg-muted">{difficulty.emoji} {difficulty.label}</Badge>
        </div>
        <div className={`rounded-2xl px-3 py-1 text-sm font-black ${urgent ? "bg-rose-100 text-rose-700" : "bg-primary/10 text-primary"}`}>
          ⏱️ {remainingSeconds}s
        </div>
      </div>

      <h2 className="mt-4 break-words text-xl font-black leading-snug sm:mt-5 sm:text-2xl md:text-3xl">{item.question.question}</h2>

      <div className="mt-5 grid gap-2">
        {item.shuffledAnswers.map((answer, index) => {
          const letter = String.fromCharCode(65 + index);
          const isCorrectOption = feedback && index === item.shuffledCorrectIndex;
          const isWrongPick = feedback && !feedback.isCorrect && feedback.correctLabel !== answer && locked;
          return (
            <Button
              key={`${item.question.id}-${index}`}
              variant="secondary"
              disabled={locked}
              onClick={() => onSelect(index)}
              className={`h-auto justify-start whitespace-normal rounded-2xl px-4 py-4 text-left text-base font-black ${
                isCorrectOption ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""
              } ${isWrongPick ? "opacity-60" : ""}`}
            >
              <span className="mr-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sm">{letter}</span>
              {answer}
            </Button>
          );
        })}
      </div>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mt-5 rounded-2xl px-4 py-4 text-center font-black ${
            feedback.isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.isCorrect ? `✅ Nice one! +${feedback.points} pts` : `❌ Correct answer: ${feedback.correctLabel}`}
        </motion.div>
      )}
    </motion.div>
  );
}
