"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { AssassinAssignmentDraft } from "@/types/game";

export function AssassinTargetGraph({ assignments }: { assignments: AssassinAssignmentDraft[] }) {
  if (!assignments.length) {
    return <p className="text-sm text-muted-foreground">Generate or design assignments to see the circle.</p>;
  }

  const radius = 120;
  const center = 150;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="relative mx-auto h-[300px] w-[300px]">
        <svg viewBox="0 0 300 300" className="h-full w-full">
          {assignments.map((assignment, index) => {
            const sourceAngle = (index / assignments.length) * Math.PI * 2 - Math.PI / 2;
            const targetIndex = assignments.findIndex((item) => item.playerId === assignment.targetId);
            const targetAngle = (targetIndex / assignments.length) * Math.PI * 2 - Math.PI / 2;
            const x1 = center + radius * Math.cos(sourceAngle);
            const y1 = center + radius * Math.sin(sourceAngle);
            const x2 = center + radius * Math.cos(targetAngle);
            const y2 = center + radius * Math.sin(targetAngle);
            return (
              <motion.line
                key={`${assignment.playerId}-${assignment.targetId}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent/70"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              />
            );
          })}
        </svg>
        {assignments.map((assignment, index) => {
          const angle = (index / assignments.length) * Math.PI * 2 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <div
              key={assignment.playerId}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card px-3 py-2 text-center shadow-sm"
              style={{ left: x, top: y }}
            >
              <p className="text-xs font-black">{assignment.playerName}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2">
        {assignments.map((assignment) => (
          <div key={assignment.playerId} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3">
            <span className="font-black">{assignment.playerName}</span>
            <ArrowRight className="h-4 w-4 text-accent" />
            <span className="font-black">{assignment.targetName}</span>
            {assignment.locked && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-black uppercase">Locked</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
