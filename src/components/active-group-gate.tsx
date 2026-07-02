"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveGroup } from "@/hooks/use-active-group";
import { LoadingCard } from "@/components/game-pages/page-shell";

export function ActiveGroupGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const state = useActiveGroup();

  useEffect(() => {
    if (state.loading || !state.userId || state.group) return;
    router.replace("/select-group");
  }, [state.loading, state.userId, state.group, router]);

  if (state.loading) {
    return <LoadingCard label="Loading your trip..." />;
  }

  if (!state.userId || !state.group) {
    return <LoadingCard label="Redirecting to your groups..." />;
  }

  return children;
}
