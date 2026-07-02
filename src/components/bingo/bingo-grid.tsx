"use client";

import { motion } from "framer-motion";
import { BINGO_CATEGORY_META, BINGO_DIFFICULTY_META } from "@/lib/bingo-constants";
import type { BingoCell } from "@/types/bingo";

function cellClasses(cell: BingoCell) {
  if (cell.isFree || cell.status === "validated") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)]";
  }
  if (cell.status === "pending") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }
  if (cell.status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  return "border-border bg-white text-slate-900 hover:border-primary hover:bg-primary/5";
}

export function BingoGrid({
  cells,
  onCellClick
}: {
  cells: BingoCell[];
  onCellClick: (cell: BingoCell) => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-5 gap-1.5 sm:gap-2">
      {cells.map((cell) => {
        const difficulty = BINGO_DIFFICULTY_META[cell.difficulty];
        const category = BINGO_CATEGORY_META[cell.category];
        const done = cell.isFree || cell.status === "validated";
        return (
          <motion.button
            key={cell.index}
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={cell.isFree}
            onClick={() => onCellClick(cell)}
            className={`relative aspect-square rounded-2xl border p-1 text-left transition sm:rounded-3xl sm:p-2 ${cellClasses(cell)} ${cell.isFree ? "cursor-default" : ""}`}
          >
            {cell.isFree ? (
              <div className="flex h-full flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl">⭐</span>
                <span className="mt-1 text-[10px] font-black uppercase tracking-wide sm:text-xs">Free</span>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-1">
                  <span className={`rounded-full border px-1 py-0.5 text-[9px] font-black sm:text-[10px] ${difficulty.color}`}>
                    {difficulty.emoji}
                  </span>
                  <span className="text-[9px] font-black text-muted-foreground sm:text-[10px]">{cell.points}pt</span>
                </div>
                <p className="mt-1 line-clamp-3 text-[10px] font-black leading-tight sm:text-xs">{cell.title}</p>
                <p className="mt-1 hidden text-[9px] font-semibold text-muted-foreground sm:block">{category.emoji} {category.label}</p>
                {done && <span className="absolute bottom-1 right-1 text-sm">✅</span>}
                {cell.status === "pending" && <span className="absolute bottom-1 right-1 text-sm">⏳</span>}
              </>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
