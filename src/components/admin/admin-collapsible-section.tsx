"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminCollapsibleSection({
  title,
  summary,
  emoji,
  defaultOpen = false,
  children
}: {
  title: string;
  summary?: string;
  emoji?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm sm:rounded-[1.5rem]">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-muted/40 sm:px-5"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="min-w-0">
          <p className="font-black">
            {emoji ? <span className="mr-2">{emoji}</span> : null}
            {title}
          </p>
          {summary ? <p className="mt-1 text-sm text-muted-foreground">{summary}</p> : null}
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t border-border px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          {children}
        </div>
      ) : null}
    </div>
  );
}
