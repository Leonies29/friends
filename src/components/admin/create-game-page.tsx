"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { notifyGamesUpdated } from "@/lib/game-events";
import { canManageGames, resolveEffectiveRole } from "@/services/permissions";
import { createGame } from "@/services/game-service";
import type { GameCategory } from "@/types";

const inputClass =
  "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";

export function CreateGamePage() {
  const router = useRouter();
  const state = useActiveGroup();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const role = resolveEffectiveRole(state.currentMember, state.group, state.userId);
  const canAdmin = canManageGames(role);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.group?.id) return;

    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const gameId = await createGame(state.group.id, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        icon: "Gamepad2",
        category: String(form.get("category") ?? "custom") as GameCategory
      });
      notifyGamesUpdated();
      router.push(`/admin/games/${gameId}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create game.");
      setSaving(false);
    }
  }

  if (state.loading) {
    return (
      <Card className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="font-semibold text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  if (!state.group || !canAdmin) {
    return (
      <Card>
        <Badge>Admin</Badge>
        <h1 className="mt-3 text-2xl font-black">Access denied</h1>
        <Button asChild className="mt-4" variant="secondary">
          <Link href="/admin">Back to admin</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit px-0">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
      </Button>

      <Card>
        <Badge>New game</Badge>
        <h1 className="mt-3 font-display text-2xl font-black sm:text-3xl">Initialize a game</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a title and type. You will configure the content on the next step.
        </p>

        <form className="mt-5 grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <input name="title" required placeholder="Game title" className={inputClass} />
          <select name="category" className={inputClass} defaultValue="custom">
            <option value="custom">Custom</option>
            <option value="challenge">Challenge</option>
            <option value="photo">Photo</option>
            <option value="treasure">Treasure Hunt</option>
            <option value="quiz">Quiz</option>
            <option value="bingo">Bingo</option>
            <option value="assassin">Assassin</option>
          </select>
          <textarea
            name="description"
            placeholder="Short description"
            rows={3}
            className={`${inputClass} resize-none`}
          />
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue to setup
          </Button>
        </form>
      </Card>
    </div>
  );
}
