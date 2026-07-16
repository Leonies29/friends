"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { QUEST_CATEGORIES } from "@/lib/game-data";
import { createGroupQuest, ensureGroupQuests, removeGroupQuest, updateGroupQuest } from "@/services/quest-service";
import type { QuestCategory, QuestDoc } from "@/types/game";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function QuestSetupPanel({ groupId }: { groupId: string }) {
  const [quests, setQuests] = useState<QuestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editXpReward, setEditXpReward] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const items = await ensureGroupQuests(groupId);
      setQuests(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load quests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [groupId]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createGroupQuest(groupId, {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      category: String(form.get("category") ?? "chaos") as QuestCategory,
      difficulty: String(form.get("difficulty") ?? "Easy") as QuestDoc["difficulty"],
      xpReward: Number(form.get("xpReward") ?? 50),
      isSecret: form.get("isSecret") === "on"
    });
    event.currentTarget.reset();
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading quests...</p>;
  if (error) return <p className="text-sm font-semibold text-rose-700">{error}</p>;

  return (
    <div className="grid gap-4">
      <form className="grid gap-2 rounded-2xl border border-border bg-background p-4" onSubmit={(event) => void handleAdd(event)}>
        <Badge>Add quest</Badge>
        <input name="title" required placeholder="Title" className={inputClass} />
        <textarea name="description" required placeholder="Description" className={`${inputClass} min-h-20`} />
        <div className="grid gap-2 md:grid-cols-3">
          <select name="category" className={inputClass}>
            {Object.entries(QUEST_CATEGORIES).map(([key, value]) => (
              <option key={key} value={key}>{value.emoji} {value.label}</option>
            ))}
          </select>
          <select name="difficulty" className={inputClass}>
            {["Easy", "Medium", "Hard", "Legendary", "Rare", "Epic"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <input name="xpReward" type="number" min={1} defaultValue={80} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="isSecret" />
          Secret quest
        </label>
        <Button type="submit" size="sm">➕ Add</Button>
      </form>

      <div className="grid gap-2">
        {quests.map((quest) => (
          <div key={quest.id} className="rounded-2xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {editingQuestId === quest.id ? (
                  <div className="grid gap-2">
                    <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="Title" className={inputClass} />
                    <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="Description" className={`${inputClass} min-h-16`} />
                    <input value={editXpReward} onChange={(event) => setEditXpReward(event.target.value)} type="number" min={1} placeholder="XP reward" className={inputClass} />
                  </div>
                ) : (
                  <>
                    <p className="font-black">{quest.isSecret ? "🔒 " : ""}{quest.title}</p>
                    <p className="text-sm text-muted-foreground">{quest.description}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{quest.difficulty} · {quest.xpReward} XP</p>
                  </>
                )}
              </div>
              <div className="flex gap-1">
                {editingQuestId === quest.id ? (
                  <>
                    <button
                      type="button"
                      title="Save"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-border text-base"
                      onClick={() => {
                        if (!editTitle.trim() || !editDescription.trim()) return;
                        const xpReward = Number(editXpReward) || quest.xpReward;
                        void updateGroupQuest(quest.id, { title: editTitle.trim(), description: editDescription.trim(), xpReward }).then(load);
                        setEditingQuestId(null);
                      }}
                    >
                      ✅
                    </button>
                    <button type="button" title="Cancel" className="grid h-9 w-9 place-items-center rounded-xl border border-border text-base" onClick={() => setEditingQuestId(null)}>✖️</button>
                  </>
                ) : (
                  <button
                    type="button"
                    title="Edit"
                    className="grid h-9 w-9 place-items-center rounded-xl border border-border text-base"
                    onClick={() => {
                      setEditingQuestId(quest.id);
                      setEditTitle(quest.title);
                      setEditDescription(quest.description);
                      setEditXpReward(String(quest.xpReward));
                    }}
                  >
                    ✏️
                  </button>
                )}
                <button
                  type="button"
                  title="Delete"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-border text-base"
                  onClick={() => quest.completedBy.length === 0 && void removeGroupQuest(quest.id).then(load)}
                  disabled={quest.completedBy.length > 0}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
