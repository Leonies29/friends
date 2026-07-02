"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import type { GroupMember } from "@/hooks/use-active-group";
import {
  emergencyChangeMission,
  emergencyChangeTarget,
  emergencyReplaceMission,
  emergencySkipMission,
  loadAssassinState,
  resetAssassinGame
} from "@/services/assassin-service";

const inputClass = "max-w-xs rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function AssassinEmergencyPanel({
  groupId,
  members: groupMembers
}: {
  groupId: string;
  members: GroupMember[];
}) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const members = groupMembers.map((member) => ({
    id: member.userId || member.id,
    name: member.nickname || member.username || "Player"
  }));

  useEffect(() => {
    void loadAssassinState(groupId).then((assassin) => setActive(assassin.game?.status === "active"));
  }, [groupId]);

  if (!active) return null;

  async function runAction(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <Card>
      <Badge>Assassin · live controls</Badge>
      <p className="mt-2 text-sm text-muted-foreground">Only while the assassin game is running.</p>
      {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
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
              <Button size="sm" variant="secondary" onClick={() => {
                const text = window.prompt("New mission text");
                if (!text) return;
                void runAction(() => emergencyChangeMission(groupId, member.id, text).then(() => setMessage(`Mission updated for ${member.name}.`)));
              }}>Change mission</Button>
              <Button size="sm" variant="secondary" onClick={() => void runAction(() => emergencySkipMission(groupId, member.id).then(() => setMessage(`Mission skipped for ${member.name}.`)))}>Skip</Button>
              <Button size="sm" variant="ghost" onClick={() => void runAction(() => emergencyReplaceMission(groupId, member.id).then((text) => setMessage(`New mission for ${member.name}: ${text}`)))}>Random mission</Button>
            </div>
          </div>
        ))}
      </div>
      <Button className="mt-4" variant="ghost" size="sm" onClick={() => void runAction(() => resetAssassinGame(groupId).then(() => setActive(false)))}>
        Reset assassin to setup
      </Button>
    </Card>
  );
}
