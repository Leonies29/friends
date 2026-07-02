"use client";

import { useEffect, useRef, useState } from "react";
import { QUIZ_TIMER_SECONDS } from "@/lib/quiz-logic";

export function useQuizTimer(active: boolean, onTimeout: () => void) {
  const [remaining, setRemaining] = useState(QUIZ_TIMER_SECONDS);
  const callbackRef = useRef(onTimeout);
  callbackRef.current = onTimeout;

  useEffect(() => {
    if (!active) {
      setRemaining(QUIZ_TIMER_SECONDS);
      return;
    }

    setRemaining(QUIZ_TIMER_SECONDS);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = Math.max(QUIZ_TIMER_SECONDS - elapsed, 0);
      setRemaining(next);
      if (next === 0) {
        window.clearInterval(timer);
        callbackRef.current();
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [active]);

  return remaining;
}

export function useQuizResponseTimer(active: boolean) {
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (active) setStartedAt(Date.now());
    else setStartedAt(null);
  }, [active]);

  function getElapsedMs() {
    return startedAt ? Date.now() - startedAt : QUIZ_TIMER_SECONDS * 1000;
  }

  return getElapsedMs;
}
