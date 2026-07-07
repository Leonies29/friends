"use client";

import { use } from "react";
import { GameSetupPage } from "@/components/admin/game-setup-page";

export default function GameSetupRoute({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  return <GameSetupPage gameId={gameId} />;
}
