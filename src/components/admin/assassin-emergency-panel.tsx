"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import {
  emergencyChangeMission,
  emergencyChangeTarget,
  emergencyReplaceMission,
  emergencySkipMission,
  loadAssassinState,
  resetAssassinGame
} from "@/services/assassin-service";

const inputClass = "max-w-xs rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function AssassinEmergencyPanel({ groupId }: { groupId: string }) {
  const state = useActiveGroup();
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  const members = state.members.map((member) => ({
    id: member.userId || member.id,
    name: member.nickname || member.username || "Player",
    avatarUrl: resolveMemberAvatar(state.group, member)
  }));

  useEffect(() => {
    void loadAssassinState(groupId).then((assassin) => setActive(assassin.game?.status === "active"));
  }, [groupId]);

  if (!active) return null;

  return (
    <Card>
      <Badge>Assassin · live controls</Badge>
      <p className="mt-2 text-sm text-muted-foreground">
        Use these only while the game is running. Setup and start stay in the game ⚙️ panel.
      </p>
      {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
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
                void emergencyChangeTarget(groupId, member.id, select.value).then(() => setMessage(`Target updated for ${member.name}.`));
              }}>Change target</Button>
              <Button size="sm" variant="secondary" onClick={() => {
                const text = window.prompt("New mission text");
                if (!text) return;
                void emergencyChangeMission(groupId, member.id, text).then(() => setMessage(`Mission updated for ${member.name}.`));
              }}>Change mission</Button>
              <Button size="sm" variant="secondary" onClick={() => void emergencySkipMission(groupId, member.id).then(() => setMessage(`Mission skipped for ${member.name}.`))}>Skip</Button>
              <Button size="sm" variant="ghost" onClick={() => void emergencyReplaceMission(groupId, member.id).then((text) => setMessage(`New mission for ${member.name}: ${text}`))}>Random mission</Button>
            </div>
          </div>
        ))}
      </div>
      <Button className="mt-4" variant="ghost" size="sm" onClick={() => void resetAssassinGame(groupId).then(() => setActive(false))}>
        Reset assassin to setup
      </Button>
    </Card>
  );
}
