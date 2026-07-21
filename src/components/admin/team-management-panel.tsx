"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Shuffle, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field } from "@/components/ui";
import { filterActiveGameMembers, memberUserId } from "@/lib/game-members";
import { useActiveGroup, type GroupMember } from "@/hooks/use-active-group";
import { listGames, setGameScoringMode } from "@/services/game-service";
import {
  createTeam,
  deleteTeam,
  listGameTeamMemberships,
  listTeams,
  setMemberTeamForGame,
  shuffleTeamsIntoMembers
} from "@/services/team-service";
import type { Game, GameTeamMembership, Team } from "@/types";

const selectClass = "rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";

function memberLabel(member: GroupMember) {
  return member.nickname || member.username || "Player";
}

export function TeamManagementPanel({ embedded = false }: { embedded?: boolean }) {
  const state = useActiveGroup();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<GameTeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [fillGapsOnly, setFillGapsOnly] = useState(true);

  const activeMembers = useMemo(() => filterActiveGameMembers(state.members), [state.members]);
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;
  const scoringMode = selectedGame?.settings?.scoringMode ?? "individual";

  const unassignedCount = useMemo(() => {
    const assignedUserIds = new Set(memberships.filter((item) => item.teamId).map((item) => item.userId));
    return activeMembers.filter((member) => !assignedUserIds.has(memberUserId(member))).length;
  }, [activeMembers, memberships]);

  useEffect(() => {
    if (!state.group?.id) return;
    void listGames(state.group.id).then((loaded) => {
      setGames(loaded);
      setSelectedGameId((current) => current || loaded[0]?.id || "");
    }).catch(() => undefined);
  }, [state.group?.id]);

  const loadGameTeamData = useCallback(async (gameId: string) => {
    if (!state.group?.id || !gameId) return;
    setLoading(true);
    try {
      const [loadedTeams, loadedMemberships] = await Promise.all([
        listTeams(state.group.id, gameId),
        listGameTeamMemberships(state.group.id, gameId)
      ]);
      setTeams(loadedTeams);
      setMemberships(loadedMemberships);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load teams.");
    } finally {
      setLoading(false);
    }
  }, [state.group?.id]);

  useEffect(() => { void loadGameTeamData(selectedGameId); }, [loadGameTeamData, selectedGameId]);

  async function runAction(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await action();
      await loadGameTeamData(selectedGameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleModeChange(mode: "individual" | "team") {
    if (!selectedGameId || mode === scoringMode) return;
    await runAction("mode", async () => {
      await setGameScoringMode(selectedGameId, mode);
      setGames((items) => items.map((game) => (
        game.id === selectedGameId ? { ...game, settings: { ...game.settings, scoringMode: mode } } : game
      )));
      setMessage(mode === "team" ? "Team mode is on for this game." : "Back to individual scoring for this game.");
    });
  }

  async function handleAddTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.group?.id || !selectedGameId) return;
    const name = newTeamName.trim();
    if (!name) return;
    await runAction("add-team", async () => {
      await createTeam(state.group!.id, selectedGameId, name);
      setNewTeamName("");
      setMessage(`${name} was created.`);
    });
  }

  async function handleDeleteTeam(team: Team) {
    if (!state.group?.id || !selectedGameId) return;
    await runAction(`delete-${team.id}`, async () => {
      await deleteTeam(state.group!.id, selectedGameId, team.id);
      setMessage(`${team.name} was removed.`);
    });
  }

  async function handleAssign(member: GroupMember, teamId: string) {
    if (!state.group?.id || !selectedGameId) return;
    const userId = memberUserId(member);
    await runAction(`assign-${userId}`, async () => {
      await setMemberTeamForGame(state.group!.id, selectedGameId, userId, teamId || null);
    });
  }

  async function handleShuffle() {
    if (!state.group?.id || !selectedGameId) return;
    if (!teams.length) {
      setError("Create at least one team before shuffling.");
      return;
    }
    await runAction("shuffle", async () => {
      await shuffleTeamsIntoMembers(
        state.group!.id,
        selectedGameId,
        activeMembers,
        memberships,
        teams.map((team) => team.id),
        fillGapsOnly ? "fill-gaps" : "reshuffle-all"
      );
      setMessage("Teams were shuffled.");
    });
  }

  function membershipFor(member: GroupMember) {
    return memberships.find((item) => item.userId === memberUserId(member))?.teamId ?? "";
  }

  const body = (
    <>
      {!embedded && (
        <>
          <Badge>Teams</Badge>
          <h3 className="mt-2 text-lg font-black">Team mode</h3>
        </>
      )}

      {games.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No games yet for this trip.</p>
      ) : (
        <>
          <label className="mt-4 grid gap-2 text-sm font-semibold">
            Game
            <select className={selectClass} value={selectedGameId} onChange={(event) => setSelectedGameId(event.target.value)}>
              {games.map((game) => (
                <option key={game.id} value={game.id}>{game.title}</option>
              ))}
            </select>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={scoringMode === "individual" ? "primary" : "secondary"} disabled={Boolean(busyId)} onClick={() => void handleModeChange("individual")}>
              Individual
            </Button>
            <Button type="button" size="sm" variant={scoringMode === "team" ? "primary" : "secondary"} disabled={Boolean(busyId)} onClick={() => void handleModeChange("team")}>
              Team
            </Button>
          </div>

          {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}

          {scoringMode === "team" && (
            <>
              {unassignedCount > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30">
                  <p className="font-black text-amber-900 dark:text-amber-200">
                    {unassignedCount} player{unassignedCount === 1 ? "" : "s"} not assigned
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    Assign them below, or shuffle with &quot;Only assign unassigned players&quot; on to place them automatically.
                  </p>
                </div>
              )}

              <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={(event) => void handleAddTeam(event)}>
                <Field
                  label="New team name"
                  placeholder="Example: The Wanderers"
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                />
                <Button type="submit" variant="secondary" size="sm" className="self-end" disabled={Boolean(busyId)}>
                  {busyId === "add-team" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add team
                </Button>
              </form>

              {loading ? (
                <p className="mt-4 text-sm text-muted-foreground">Loading teams...</p>
              ) : (
                <div className="mt-4 grid gap-2">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-3">
                      <p className="font-black">{team.name}</p>
                      <Button type="button" variant="ghost" size="sm" disabled={Boolean(busyId)} onClick={() => void handleDeleteTeam(team)}>
                        {busyId === `delete-${team.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                  {teams.length === 0 && <p className="text-sm text-muted-foreground">No teams yet — add one above.</p>}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={fillGapsOnly} onChange={(event) => setFillGapsOnly(event.target.checked)} />
                  Only assign unassigned players
                </label>
                <Button type="button" size="sm" variant="secondary" disabled={Boolean(busyId) || !teams.length} onClick={() => void handleShuffle()}>
                  {busyId === "shuffle" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                  Shuffle teams
                </Button>
              </div>

              <div className="mt-5 grid gap-2">
                {activeMembers.map((member) => (
                  <div key={member.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-black">{memberLabel(member)}</p>
                    <select
                      className={selectClass}
                      value={membershipFor(member)}
                      disabled={Boolean(busyId)}
                      onChange={(event) => void handleAssign(member, event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {activeMembers.length === 0 && <p className="text-sm text-muted-foreground">No active players yet.</p>}
              </div>
            </>
          )}
        </>
      )}
    </>
  );

  return embedded ? body : <Card>{body}</Card>;
}
