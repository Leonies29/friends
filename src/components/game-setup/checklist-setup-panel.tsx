"use client";

import { FormEvent, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { updateGame } from "@/services/game-service";
import type { Game, GameChecklistItem } from "@/types";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function ChecklistSetupPanel({ game, onSaved }: { game: Game; onSaved: () => void }) {
  const [items, setItems] = useState<GameChecklistItem[]>(game.settings?.checklistItems ?? []);

  async function persist(next: GameChecklistItem[]) {
    setItems(next);
    await updateGame(game.id, { settings: { ...game.settings, checklistItems: next } });
    onSaved();
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: GameChecklistItem = {
      id: `item-${Date.now()}`,
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      xpReward: Number(form.get("xpReward") ?? 20)
    };
    await persist([...items, next]);
    event.currentTarget.reset();
  }

  return (
    <div className="grid gap-4">
      <form className="grid gap-2 rounded-2xl border border-border bg-background p-4" onSubmit={(event) => void handleAdd(event)}>
        <Badge>Add item</Badge>
        <input name="title" required placeholder="Title" className={inputClass} />
        <input name="description" placeholder="Description" className={inputClass} />
        <input name="xpReward" type="number" min={1} defaultValue={20} className={inputClass} />
        <Button type="submit" size="sm">➕ Add</Button>
      </form>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2 rounded-2xl border border-border bg-background p-3">
            <div>
              <p className="font-black">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <p className="text-xs font-semibold text-muted-foreground">{item.xpReward} XP</p>
            </div>
            <div className="flex gap-1">
              <button type="button" title="Edit" className="grid h-9 w-9 place-items-center rounded-xl border border-border" onClick={() => {
                const title = window.prompt("Title", item.title);
                const description = window.prompt("Description", item.description);
                if (!title) return;
                void persist(items.map((entry) => entry.id === item.id ? { ...entry, title, description: description ?? entry.description } : entry));
              }}>✏️</button>
              <button type="button" title="Delete" className="grid h-9 w-9 place-items-center rounded-xl border border-border" onClick={() => void persist(items.filter((entry) => entry.id !== item.id))}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
