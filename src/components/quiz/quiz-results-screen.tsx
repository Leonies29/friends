"use client";

import { motion } from "framer-motion";
import { Badge, Button, Card } from "@/components/ui";
import type { QuizSession } from "@/types/quiz";

export function QuizResultsScreen({
  session,
  onReplayLeaderboard
}: {
  session: QuizSession;
  onReplayLeaderboard: () => void;
}) {
  const rate = session.totalAnswered ? Math.round((session.correctCount / session.totalAnswered) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden bg-gradient-to-br from-[#f6ead8] via-white to-emerald-50 p-6 text-center">
        <Badge>Quiz terminé</Badge>
        <motion.p
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="mt-4 text-5xl"
        >
          🏛️
        </motion.p>
        <h2 className="mt-3 text-3xl font-black">Bravo {session.displayName} !</h2>
        <p className="mt-2 text-muted-foreground">Tu connais Istanbul un peu mieux maintenant.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Score</p>
            <p className="mt-1 text-3xl font-black">{session.score}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Bonnes réponses</p>
            <p className="mt-1 text-3xl font-black">{session.correctCount}/{session.totalAnswered}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Réussite</p>
            <p className="mt-1 text-3xl font-black">{rate}%</p>
          </div>
        </div>

        <Button className="mt-6" onClick={onReplayLeaderboard}>Voir le classement</Button>
      </Card>
    </motion.div>
  );
}
