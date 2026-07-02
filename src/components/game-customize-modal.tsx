"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { updateGame } from "@/services/game-service";
import type { Game, GameCategory, XpRule, XpSourceType } from "@/types";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";
const categories: GameCategory[] = ["custom", "challenge", "photo", "treasure", "quiz", "bingo", "assassin"];
const sourceTypes: XpSourceType[] = ["quest", "challenge", "photo", "game", "admin_adjustment"];

export function GameCustomizeModal({
  game,
  onClose,
  onSaved
}: {
  game: Game;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description);
  const [icon, setIcon] = useState(game.icon);
  const [category, setCategory] = useState(game.category);
  const [xpRules, setXpRules] = useState<XpRule[]>(game.xpRules ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(game.title);
    setDescription(game.description);
    setIcon(game.icon);
    setCategory(game.category);
    setXpRules(game.xpRules ?? []);
  }, [game]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    await updateGame(game.id, {
      title,
      description,
      icon,
      category,
      xpRules
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  function updateRule(index: number, patch: Partial<XpRule>) {
    setXpRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge>Customize game</Badge>
            <h2 className="mt-3 text-3xl font-black">{game.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Edit rules, XP rewards, and presentation for this game.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" required />
          <textarea className={`${inputClass} min-h-24`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" required />
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inputClass} value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="Icon name" />
            <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value as GameCategory)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm font-black">XP rules</p>
            <div className="grid gap-2">
              {xpRules.map((rule, index) => (
                <div key={rule.id} className="grid gap-2 rounded-2xl border border-border bg-background p-3 md:grid-cols-[1fr_120px_140px_auto]">
                  <input className={inputClass} value={rule.label} onChange={(event) => updateRule(index, { label: event.target.value })} placeholder="Rule label" />
                  <input className={inputClass} type="number" value={rule.amount} onChange={(event) => updateRule(index, { amount: Number(event.target.value) })} placeholder="XP" />
                  <select className={inputClass} value={rule.sourceType} onChange={(event) => updateRule(index, { sourceType: event.target.value as XpSourceType })}>
                    {sourceTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setXpRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index))}>Remove</Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => setXpRules((current) => [...current, { id: `rule-${Date.now()}`, label: "New rule", amount: 10, sourceType: "game" }])}
            >
              Add XP rule
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
