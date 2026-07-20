"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#f97316", "#facc15", "#22c55e", "#3b82f6", "#ec4899", "#a855f7"];

export function ConfettiBurst({ pieceCount = 70 }: { pieceCount?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, index) => ({
        id: index,
        x: Math.random() * 100,
        drift: (Math.random() - 0.5) * 220,
        rotate: Math.random() * 360,
        delay: Math.random() * 0.35,
        duration: 1.6 + Math.random() * 1.4,
        color: COLORS[index % COLORS.length],
        width: 6 + Math.random() * 6,
        height: 10 + Math.random() * 8
      })),
    [pieceCount]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ opacity: 1, y: "-10%", x: `${piece.x}%`, rotate: 0 }}
          animate={{ opacity: [1, 1, 0], y: "120%", x: `calc(${piece.x}% + ${piece.drift}px)`, rotate: piece.rotate }}
          transition={{ duration: piece.duration, delay: piece.delay, ease: "easeIn" }}
          className="absolute top-0 block rounded-sm"
          style={{ left: 0, width: piece.width, height: piece.height, backgroundColor: piece.color }}
        />
      ))}
    </div>
  );
}
