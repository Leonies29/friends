"use client";

import { AnimatePresence, motion } from "framer-motion";

export function BingoCelebration({ visible, lines, points }: { visible: boolean; lines: string[]; points: number }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="fixed inset-x-4 top-24 z-[130] mx-auto max-w-md rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 p-6 text-center shadow-2xl"
        >
          <motion.p
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-5xl font-black"
          >
            🎉 BINGO !
          </motion.p>
          <p className="mt-3 text-lg font-black text-amber-900">
            {lines.length} line{lines.length > 1 ? "s" : ""} completed
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-800">+{points} points bonus</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
