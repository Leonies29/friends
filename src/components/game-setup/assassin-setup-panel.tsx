"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { filterActiveGameMembers } from "@/lib/game-members";
import { useActiveGroup } from "@/hooks/use-active-group";
import { ASSASSIN_MISSION_CATEGORIES, ASSASSIN_MISSION_DIFFICULTIES } from "@/lib/assassin-default-missions";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import { createMissionTemplate, ensureMissionLibrary } from "@/services/assassin-mission-library-service";
import { buildCycle, generateRandomSetup, getAssassinSetup } from "@/services/assassin-setup-service";
import { loadAssassinState, startAssassinGame } from "@/services/assassin-service";
import { AssassinTargetGraph } from "@/components/game-pages/assassin-target-graph";
import type { AssassinAssignmentDraft, AssassinMissionTemplate } from "@/types/game";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function AssassinSetupPanel({ groupId }: { groupId: string }) {
  const state = useActiveGroup();
  const [assignments, setAssignments] = useState<AssassinAssignmentDraft[]>([]);
  const [templates, setTemplates] = useState<AssassinMissionTemplate[]>([]);
  const [gameStatus, setGameStatus] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const members = useMemo(() => filterActiveGameMembers(state.members).map((member) => ({
    id: member.userId || member.id,
    name: member.nickname || member.username || "Player",
    avatarUrl: resolveMemberAvatar(state.group, member)
  })), [state.group, state.members]);

  const memberKey = members.map((member) => member.id).join("|");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [setup, missionTemplates, assassin] = await Promise.all([
        getAssassinSetup(groupId),
        ensureMissionLibrary(groupId),
        loadAssassinState(groupId)
      ]);
      setTemplates(missionTemplates);
      setAssignments(setup?.assignments ?? buildCycle(members));
      setGameStatus(assassin.game?.status ?? "setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load assassin setup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [groupId, memberKey]);

  async function handleAddMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createMissionTemplate(groupId, {
      title: String(form.get("title") ?? ""),
      text: String(form.get("text") ?? ""),
      difficulty: String(form.get("difficulty") ?? "Easy") as AssassinMissionTemplate["difficulty"],
      category: String(form.get("category") ?? "Speech") as AssassinMissionTemplate["category"]
    });
    event.currentTarget.reset();
    await load();
  }

  return (
    <div className="grid gap-4">
      {loading && <p className="text-sm text-muted-foreground">Loading assassin setup...</p>}
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
      {gameStatus === "active" && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Game already started. Live changes are available in Admin → Assassin live controls.</p>
      )}
      {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="button" onClick={() => void generateRandomSetup(groupId, members, "random").then((next) => { setAssignments(next); setMessage("Random circle generated."); })}>🎲 Generate</Button>
        <Button size="sm" variant="secondary" type="button" onClick={() => void generateRandomSetup(groupId, members, "random", assignments).then((next) => { setAssignments(next); setMessage("Regenerated."); })}>🔁 Regenerate</Button>
        <Button size="sm" type="button" disabled={gameStatus === "active"} onClick={() => void startAssassinGame(groupId, members.map((member) => ({ id: member.id, username: member.name, avatarUrl: member.avatarUrl }))).then(() => { setMessage("Assassin game started."); void load(); }).catch((err) => setError(err instanceof Error ? err.message : "Unable to start assassin game."))}>▶️ Start assassin</Button>
      </div>

      <AssassinTargetGraph assignments={assignments} />

      <form className="grid gap-2 rounded-2xl border border-border bg-background p-4" onSubmit={(event) => void handleAddMission(event)}>
        <Badge>Mission library</Badge>
        <input name="title" required placeholder="Mission title" className={inputClass} />
        <textarea name="text" required placeholder="Mission text" className={`${inputClass} min-h-16`} />
        <div className="grid gap-2 md:grid-cols-2">
          <select name="difficulty" className={inputClass}>{ASSASSIN_MISSION_DIFFICULTIES.map((item) => <option key={item}>{item}</option>)}</select>
          <select name="category" className={inputClass}>{ASSASSIN_MISSION_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <Button type="submit" size="sm">➕ Add mission</Button>
      </form>

      <div className="grid gap-2">
        {templates.slice(0, 8).map((template) => (
          <div key={template.id} className="rounded-2xl border border-border bg-background p-3 text-sm">
            <p className="font-black">{template.title}</p>
            <p className="text-muted-foreground">{template.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
