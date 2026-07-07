import { GameSetupPage } from "@/components/admin/game-setup-page";

export function generateStaticParams() {
  return [{ gameId: "_" }];
}

type GameSetupRouteProps = {
  params: Promise<{ gameId: string }>;
};

export default async function GameSetupRoute({ params }: GameSetupRouteProps) {
  const { gameId } = await params;
  return <GameSetupPage gameId={gameId} />;
}
