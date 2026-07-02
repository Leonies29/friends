"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Dices, Library, Network, Palette, Play, RefreshCw, Shield, Wrench } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { ASSASSIN_MISSION_CATEGORIES, ASSASSIN_MISSION_DIFFICULTIES } from "@/lib/assassin-default-missions";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import {
  archiveMissionTemplate,
  createMissionTemplate,
  duplicateMissionTemplate,
  ensureMissionLibrary,
  listMissionTemplates,
  updateMissionTemplate
} from "@/services/assassin-mission-library-service";
import {
  applyDragTarget,
  buildCycle,
  generateRandomSetup,
  getAssassinSetup,
  saveDesignerSetup,
  validateAssignments
} from "@/services/assassin-setup-service";
import {
  emergencyChangeMission,
  emergencyChangeTarget,
  emergencyReplaceMission,
  emergencySkipMission,
  loadAssassinState,
  resetAssassinGame,
  startAssassinGame
} from "@/services/assassin-service";
import { canManageGames } from "@/services/permissions";
import type { AssassinAssignmentDraft, AssassinMissionTemplate, AssassinSetupMode } from "@/types/game";
import { AssassinTargetGraph } from "@/components/game-pages/assassin-target-graph";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";
type TabId = "random" | "designer" | "library" | "graph" | "emergency";

function toMembers(state: ReturnType<typeof useActiveGroup>) {
  return state.members.map((member) => ({
    id: member.userId || member.id,
    name: member.nickname || member.username || "Player",
    avatarUrl: resolveMemberAvatar(state.group, member)
  }));
}

export function AssassinAdminPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("random");
  const [mode, setMode] = useState<AssassinSetupMode>("random");
  const [assignments, setAssignments] = useState<AssassinAssignmentDraft[]>([]);
  const [templates, setTemplates] = useState<AssassinMissionTemplate[]>([]);
  const [gameStatus, setGameStatus] = useState<"setup" | "active" | "finished" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const members = useMemo(() => toMembers(state), [state.group, state.members]);
  const canAdmin = canManageGames(state.currentMember?.role);

  async function loadAll() {
    if (!state.group?.id) return;
    setLoading(true);
    setError("");
    const groupId = state.group.id;
    const [setup, missionTemplates, assassin] = await Promise.all([
      getAssassinSetup(groupId),
      ensureMissionLibrary(groupId),
      loadAssassinState(groupId)
    ]);
    setTemplates(missionTemplates);
    setAssignments(setup?.assignments ?? buildCycle(members));
    setMode(setup?.mode ?? "random");
    setGameStatus(assassin.game?.status ?? "setup");
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [state.group?.id, state.members.length]);

  const validationError = useMemo(() => validateAssignments(
    members.map((member) => ({ id: member.id, name: member.name })),
    assignments
  ), [assignments, members]);

  async function handleGenerate(nextMode: AssassinSetupMode = mode) {
    if (!state.group?.id) return;
    setError("");
    const next = await generateRandomSetup(state.group.id, members, nextMode, assignments);
    setAssignments(next);
    setMode(nextMode);
    setMessage(nextMode === "hybrid" ? "Hybrid setup generated. Locked missions were kept." : "Random game generated.");
  }

  async function handleSaveDesigner() {
    if (!state.group?.id) return;
    await saveDesignerSetup(state.group.id, assignments, mode);
    setMessage("Designer setup saved.");
  }

  async function handleStartGame() {
    if (!state.group?.id || validationError) {
      setError(validationError ?? "Invalid setup.");
      return;
    }
    await saveDesignerSetup(state.group.id, assignments, mode);
    await startAssassinGame(state.group.id, members.map((member) => ({
      id: member.id,
      username: member.name,
      avatarUrl: member.avatarUrl
    })));
    setGameStatus("active");
    setMessage("Assassin game started.");
    setTab("emergency");
    await loadAll();
  }

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.group?.id) return;
    const form = new FormData(event.currentTarget);
    await createMissionTemplate(state.group.id, {
      title: String(form.get("title") ?? ""),
      text: String(form.get("text") ?? ""),
      difficulty: String(form.get("difficulty") ?? "Easy") as AssassinMissionTemplate["difficulty"],
      category: String(form.get("category") ?? "Speech") as AssassinMissionTemplate["category"]
    });
    event.currentTarget.reset();
    setTemplates(await listMissionTemplates(state.group.id));
    setMessage("Mission template created.");
  }

  function updateAssignment(playerId: string, patch: Partial<AssassinAssignmentDraft>) {
    setAssignments((current) => current.map((item) => item.playerId === playerId ? { ...item, ...patch } : item));
  }

  function onDropTarget(event: DragEvent<HTMLDivElement>, playerId: string) {
    event.preventDefault();
    if (!dragTargetId) return;
    const target = members.find((member) => member.id === dragTargetId);
    if (!target) return;
    setAssignments((current) => applyDragTarget(current, playerId, dragTargetId, members.map((member) => ({ id: member.id, name: member.name }))));
    setDragTargetId(null);
  }

  if (state.loading || loading) return <LoadingCard label="Loading assassin admin..." />;
  if (!state.group) return <EmptyGroupCard />;
  if (!canAdmin) {
    return (
      <PageShell eyebrow="Assassin Admin" title="Admin only" description="Only owners and admins can configure the assassin game." group={state.group}>
        <Card><p className="text-muted-foreground">Ask an admin to configure the game.</p></Card>
      </PageShell>
    );
  }

  const tabs: Array<{ id: TabId; label: string; emoji: string; icon: typeof Dices }> = [
    { id: "random", label: "Random Setup", emoji: "🎲", icon: Dices },
    { id: "designer", label: "Designer Setup", emoji: "🎨", icon: Palette },
    { id: "library", label: "Mission Library", emoji: "📚", icon: Library },
    { id: "graph", label: "Target Graph", emoji: "👥", icon: Network },
    { id: "emergency", label: "Emergency", emoji: "🛠️", icon: Wrench }
  ];

  return (
    <PageShell eyebrow="Assassin Admin" title="Assassin Configuration" description="Configure random, designer, or hybrid modes, manage the mission library, preview the circle, and start the game." group={state.group}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge>{gameStatus === "active" ? "Game active" : "Setup mode"}</Badge>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void handleGenerate("random")}><Dices className="h-4 w-4" />Generate Random Game</Button>
            <Button variant="secondary" size="sm" onClick={() => void handleGenerate(mode)}><RefreshCw className="h-4 w-4" />Regenerate</Button>
            <Button size="sm" onClick={() => void handleStartGame()} disabled={Boolean(validationError)}><Play className="h-4 w-4" />Start Game</Button>
          </div>
        </div>
        {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
        {validationError && gameStatus !== "active" && <p className="mt-3 text-sm font-semibold text-amber-700">{validationError}</p>}
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-2xl px-4 py-3 text-sm font-black ${tab === item.id ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>

      {tab === "random" && (
        <Card>
          <Badge>Random mode</Badge>
          <p className="mt-3 text-muted-foreground">Automatically assign targets, create the assassin circle, and pick random missions from the library.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => { setMode("random"); void handleGenerate("random"); }}>Generate Random Game</Button>
            <Button variant="secondary" onClick={() => { setMode("hybrid"); void handleGenerate("hybrid"); }}>Generate Hybrid (keep locked)</Button>
            <Button variant="secondary" onClick={() => void handleGenerate("random")}>Regenerate</Button>
          </div>
        </Card>
      )}

      {tab === "designer" && (
        <Card>
          <Badge>Designer mode</Badge>
          <p className="mt-3 text-muted-foreground">Manually choose each target and mission. Drag a player chip onto another row to reassign a target.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {members.map((member) => (
              <div
                key={member.id}
                draggable
                onDragStart={() => setDragTargetId(member.id)}
                className="flex cursor-grab items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2"
              >
                <Avatar src={member.avatarUrl ?? ""} alt={member.name} className="h-8 w-8" />
                <span className="text-sm font-black">{member.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.playerId}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDropTarget(event, assignment.playerId)}
                className="rounded-3xl border border-dashed border-border bg-background p-4"
              >
                <div className="grid gap-3 lg:grid-cols-[180px_180px_1fr_auto] lg:items-center">
                  <p className="font-black">{assignment.playerName}</p>
                  <select
                    className={inputClass}
                    value={assignment.targetId}
                    onChange={(event) => {
                      const target = members.find((member) => member.id === event.target.value);
                      if (!target) return;
                      updateAssignment(assignment.playerId, { targetId: target.id, targetName: target.name });
                    }}
                  >
                    {members.filter((member) => member.id !== assignment.playerId).map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    value={assignment.missionText}
                    onChange={(event) => updateAssignment(assignment.playerId, { missionText: event.target.value })}
                    placeholder="Custom mission text"
                  />
                  <label className="flex items-center gap-2 text-sm font-black">
                    <input
                      type="checkbox"
                      checked={Boolean(assignment.locked)}
                      onChange={(event) => updateAssignment(assignment.playerId, { locked: event.target.checked })}
                    />
                    Lock
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setMode("designer"); void handleSaveDesigner(); }}>Save designer setup</Button>
            <Button variant="secondary" onClick={() => { setMode("hybrid"); void handleGenerate("hybrid"); }}>Fill unlocked with random</Button>
          </div>
        </Card>
      )}

      {tab === "library" && (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <Card>
            <Badge>Create mission</Badge>
            <form className="mt-4 grid gap-3" onSubmit={(event) => void handleCreateTemplate(event)}>
              <input name="title" required placeholder="Title" className={inputClass} />
              <textarea name="text" required placeholder="Mission text" className={`${inputClass} min-h-24`} />
              <select name="difficulty" className={inputClass}>{ASSASSIN_MISSION_DIFFICULTIES.map((item) => <option key={item}>{item}</option>)}</select>
              <select name="category" className={inputClass}>{ASSASSIN_MISSION_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
              <Button type="submit">Create mission</Button>
            </form>
          </Card>
          <div className="grid gap-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge>{template.category} · {template.difficulty}</Badge>
                    <h3 className="mt-2 text-xl font-black">{template.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{template.text}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => {
                      const title = window.prompt("Title", template.title);
                      const text = window.prompt("Mission text", template.text);
                      if (!title || !text) return;
                      void updateMissionTemplate(template.id, { title, text }).then(() => loadAll());
                    }}>Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => void duplicateMissionTemplate(state.group!.id, template).then(() => loadAll())}>Duplicate</Button>
                    <Button size="sm" variant="secondary" onClick={() => void updateMissionTemplate(template.id, { active: !template.active }).then(() => loadAll())}>{template.active ? "Deactivate" : "Activate"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => void archiveMissionTemplate(template.id).then(() => loadAll())}>Archive</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "graph" && (
        <Card>
          <Badge>Target graph</Badge>
          <div className="mt-4">
            <AssassinTargetGraph assignments={assignments} />
          </div>
        </Card>
      )}

      {tab === "emergency" && gameStatus === "active" && (
        <Card>
          <Badge>Emergency reassignment</Badge>
          <div className="mt-4 grid gap-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-3xl border border-border bg-background p-4">
                <p className="font-black">{member.name}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <select id={`target-${member.id}`} className={inputClass + " max-w-xs"} defaultValue="">
                    <option value="" disabled>Change target</option>
                    {members.filter((item) => item.id !== member.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" onClick={() => {
                    const select = document.getElementById(`target-${member.id}`) as HTMLSelectElement | null;
                    if (!select?.value || !state.group?.id) return;
                    void emergencyChangeTarget(state.group.id, member.id, select.value).then(() => setMessage(`Target updated for ${member.name}.`));
                  }}>Change target</Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    const text = window.prompt("New mission text");
                    if (!text || !state.group?.id) return;
                    void emergencyChangeMission(state.group.id, member.id, text).then(() => setMessage(`Mission updated for ${member.name}.`));
                  }}>Change mission</Button>
                  <Button size="sm" variant="secondary" onClick={() => state.group?.id && void emergencySkipMission(state.group.id, member.id).then(() => setMessage(`Mission skipped for ${member.name}.`))}>Skip mission</Button>
                  <Button size="sm" variant="ghost" onClick={() => state.group?.id && void emergencyReplaceMission(state.group.id, member.id).then((text) => setMessage(`New random mission for ${member.name}: ${text}`))}>Replace mission</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <Badge>Mission preview</Badge>
        <div className="mt-4 grid gap-3">
          {assignments.map((assignment) => (
            <motion.div key={assignment.playerId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-background p-4">
              <p className="text-xl font-black">{assignment.playerName}</p>
              <p className="mt-1 text-sm text-muted-foreground">Target: {assignment.targetName}</p>
              <p className="mt-2 font-semibold">Mission: {assignment.missionText}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void handleStartGame()} disabled={Boolean(validationError)}><Shield className="h-4 w-4" />Start Game</Button>
          <Button variant="secondary" onClick={() => void handleGenerate(mode)}><RefreshCw className="h-4 w-4" />Regenerate</Button>
          <Button variant="secondary" onClick={() => setTab("designer")}>Edit</Button>
          {gameStatus === "active" && (
            <Button variant="ghost" onClick={() => state.group?.id && void resetAssassinGame(state.group.id).then(() => loadAll())}>Reset to setup</Button>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
