"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveGroup } from "@/hooks/use-active-group";
import { LoadingCard } from "@/components/game-pages/page-shell";
import { getActiveGroupCookie } from "@/lib/session-cookies";

export function ActiveGroupGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const state = useActiveGroup();
  const pendingGroupId = getActiveGroupCookie();

  useEffect(() => {
    if (state.loading || !state.userId || state.group) return;
    if (pendingGroupId) return;
    router.replace("/select-group");
  }, [state.loading, state.userId, state.group, pendingGroupId, router]);

  if (state.loading) {
    return <LoadingCard label="Loading your trip..." />;
  }

  if (!state.userId || !state.group) {
    return <LoadingCard label={pendingGroupId ? "Opening your trip..." : "Redirecting to your groups..."} />;
  }

  return children;
}
