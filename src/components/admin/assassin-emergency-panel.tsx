"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { AdminCollapsibleSection } from "@/components/admin/admin-collapsible-section";
import { memberUserId } from "@/lib/game-members";
import { useActiveGroup, type GroupMember } from "@/hooks/use-active-group";
import type { AssassinElimination } from "@/types/game";
import {
  emergencyChangeMission,
  emergencyChangeTarget,
  emergencyReplaceMission,
  emergencySkipMission,
  loadAssassinState,
  resetAssassinGame,
  resolveContestedElimination,
  updateAssassinGameSettings
} from "@/services/assassin-service";

const inputClass = "max-w-xs rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function AssassinEmergencyPanel({
  groupId,
  members: groupMembers,
  embedded = false
}: {
  groupId: string;
  members: GroupMember[];
  embedded?: boolean;
}) {
  const state = useActiveGroup();
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [contested, setContested] = useState<AssassinElimination[]>([]);
  const [editingMissionFor, setEditingMissionFor] = useState<string | null>(null);
  const [missionText, setMissionText] = useState("");
  const [startingLives, setStartingLives] = useState(5);

  const members = groupMembers.map((member) => ({
    id: memberUserId(member),
    name: member.nickname || member.username || "Player"
  }));

  const refresh = useCallback(async () => {
    const assassin = await loadAssassinState(groupId);
    setActive(assassin.game?.status === "active");
    setContested(assassin.eliminations.filter((item) => item.status === "contested"));
    setStartingLives(assassin.game?.startingLives ?? 5);
  }, [groupId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!active) return null;

  async function runAction(action: () => Promise<void>) {
    setError("");
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  function memberName(id: string) {
    return members.find((member) => member.id === id)?.name ?? id;
  }

  const body = (
    <>
      {!embedded && (
        <>
          <Badge>Assassin · live controls</Badge>
          <p className="mt-2 text-sm text-muted-foreground">Only while the assassin game is running.</p>
        </>
      )}
      {message && <p className={`text-sm font-semibold text-emerald-700 ${embedded ? "mb-3" : "mt-3"}`}>{message}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}

      <div className="mt-4 rounded-2xl border border-border bg-background p-4">
        <p className="font-black">Starting lives</p>
        <p className="mt-1 text-sm text-muted-foreground">Set the default number of lives for each player at the start of the game.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="number" min={3} max={10} step={1} value={startingLives} onChange={(event) => setStartingLives(Number(event.target.value))} className={inputClass} />
          <Button size="sm" onClick={() => void runAction(async () => {
            await updateAssassinGameSettings(groupId, { startingLives });
            setMessage(`Starting lives set to ${startingLives}.`);
          })}>Save lives</Button>
        </div>
      </div>

      {contested.length > 0 && (
        <div className="mt-4 grid gap-3">
          <p className="font-black">Contested eliminations — admin review</p>
          {contested.map((item) => (
            <div key={item.id} className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p className="font-black">{memberName(item.killerId)} claims to have eliminated {memberName(item.victimId)}</p>
              <p className="mt-1 text-sm text-muted-foreground">The victim refused. Confirm or reject the elimination.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={!state.userId} onClick={() => void runAction(async () => {
                  if (!state.userId) return;
                  await resolveContestedElimination(item.id, true, state.userId);
                  setMessage(`Elimination confirmed: ${memberName(item.killerId)} → ${memberName(item.victimId)}`);
                })}>
                  Confirm
                </Button>
                <Button size="sm" variant="secondary" disabled={!state.userId} onClick={() => void runAction(async () => {
                  if (!state.userId) return;
                  await resolveContestedElimination(item.id, false, state.userId);
                  setMessage(`Elimination rejected: ${memberName(item.killerId)} → ${memberName(item.victimId)}`);
                })}>
                  Contest rejected
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-2xl border border-border bg-background p-4">
            <p className="font-black">{member.name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select id={`target-${member.id}`} className={inputClass} defaultValue="">
                <option value="" disabled>New target</option>
                {members.filter((item) => item.id !== member.id).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={() => {
                const select = document.getElementById(`target-${member.id}`) as HTMLSelectElement | null;
                if (!select?.value) return;
                void runAction(() => emergencyChangeTarget(groupId, member.id, select.value).then(() => setMessage(`Target updated for ${member.name}.`)));
              }}>Change target</Button>
              {editingMissionFor === member.id ? (
                <>
                  <input
                    value={missionText}
                    onChange={(event) => setMissionText(event.target.value)}
                    placeholder="New mission text"
                    className={inputClass}
                  />
                  <Button size="sm" variant="secondary" onClick={() => {
                    if (!missionText.trim()) return;
                    void runAction(() => emergencyChangeMission(groupId, member.id, missionText.trim()).then(() => setMessage(`Mission updated for ${member.name}.`)));
                    setEditingMissionFor(null);
                    setMissionText("");
                  }}>Save mission</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingMissionFor(null); setMissionText(""); }}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => { setEditingMissionFor(member.id); setMissionText(""); }}>Change mission</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => void runAction(() => emergencySkipMission(groupId, member.id).then(() => setMessage(`Mission skipped for ${member.name}.`)))}>Skip</Button>
              <Button size="sm" variant="ghost" onClick={() => void runAction(() => emergencyReplaceMission(groupId, member.id).then((text) => setMessage(`New mission for ${member.name}: ${text}`)))}>Random mission</Button>
            </div>
          </div>
        ))}
      </div>
      <Button className="mt-4" variant="ghost" size="sm" onClick={() => void runAction(() => resetAssassinGame(groupId).then(() => setActive(false)))}>
        Reset assassin to setup
      </Button>
    </>
  );

  return embedded ? body : <Card>{body}</Card>;
}

export function AssassinEmergencySection({
  groupId,
  members
}: {
  groupId: string;
  members: GroupMember[];
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    void loadAssassinState(groupId).then((assassin) => {
      setActive(assassin.game?.status === "active");
    });
  }, [groupId]);

  if (!active) return null;

  return (
    <AdminCollapsibleSection
      title="Assassin live controls"
      emoji="🔪"
      summary="Emergency actions while the assassin game is running."
    >
      <AssassinEmergencyPanel groupId={groupId} members={members} embedded />
    </AdminCollapsibleSection>
  );
}
