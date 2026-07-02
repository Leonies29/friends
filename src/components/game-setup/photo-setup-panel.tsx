"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { SHARED_ALBUM_URL } from "@/lib/game-data";
import { updateGame } from "@/services/game-service";
import type { Game } from "@/types";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function PhotoSetupPanel({ game, onSaved }: { game: Game; onSaved: () => void }) {
  const [albumUrl, setAlbumUrl] = useState(game.settings?.albumUrl ?? SHARED_ALBUM_URL);
  const [description, setDescription] = useState(game.description);

  useEffect(() => {
    setAlbumUrl(game.settings?.albumUrl ?? SHARED_ALBUM_URL);
    setDescription(game.description);
  }, [game]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    await updateGame(game.id, {
      description,
      settings: { ...game.settings, albumUrl }
    });
    onSaved();
  }

  return (
    <form className="grid gap-3" onSubmit={(event) => void handleSave(event)}>
      <Badge>Travel album settings</Badge>
      <p className="text-sm text-muted-foreground">Photos stay external. Only the shared album link is stored here.</p>
      <input className={inputClass} value={albumUrl} onChange={(event) => setAlbumUrl(event.target.value)} placeholder="Shared album URL" required />
      <textarea className={`${inputClass} min-h-20`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description shown to players" />
      <Button type="submit" size="sm">💾 Save</Button>
    </form>
  );
}
