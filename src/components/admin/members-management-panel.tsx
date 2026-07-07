"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Plus, UserMinus, UserPlus } from "lucide-react";
import { Badge, Button, Card, Field } from "@/components/ui";
import { filterActiveGameMembers } from "@/lib/game-members";
import { useActiveGroup, type GroupMember } from "@/hooks/use-active-group";
import { addPlannedMemberSlot, removePlannedMemberSlot } from "@/services/group-service";
import { deactivateGroupMember, demoteMemberToPlayer, promoteMemberToAdmin, reactivateGroupMember, transferGroupOwnership } from "@/services/member-service";

function memberLabel(member: GroupMember) {
  return member.nickname || member.username || "Player";
}

export function MembersManagementPanel({ embedded = false }: { embedded?: boolean }) {
  const state = useActiveGroup();
  const [guestNickname, setGuestNickname] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeMembers = useMemo(() => filterActiveGameMembers(state.members), [state.members]);
  const inactiveMembers = useMemo(
    () => state.members.filter((member) => member.status === "inactive"),
    [state.members]
  );
  const pendingGuests = useMemo(
    () => (state.group?.plannedMembers ?? []).filter((slot) => !slot.claimedBy),
    [state.group?.plannedMembers]
  );

  async function runAction(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await action();
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.group?.id) return;
    const nickname = guestNickname.trim();
    if (!nickname) return;

    await runAction("add-guest", async () => {
      await addPlannedMemberSlot(state.group!.id, nickname);
      setGuestNickname("");
      setMessage(`${nickname} can now join with the invite code.`);
    });
  }

  const isOwner = state.userId === state.group?.ownerId || state.userId === state.group?.createdBy;

  const body = (
    <>
      {!embedded && (
        <>
          <Badge>Players</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Deactivate a guest so they are ignored by games. Add a nickname so a friend can join for the day.
          </p>
        </>
      )}

      {message && <p className={`text-sm font-semibold text-emerald-700 ${embedded ? "" : "mt-3"}`}>{message}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}

      <div className="mt-4 grid gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Active in games ({activeMembers.length})
        </p>
        {activeMembers.map((member) => {
          const userId = member.userId || member.id;
          const memberIsOwner = userId === state.group?.ownerId || userId === state.group?.createdBy;
          return (
            <div key={member.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-background px-3 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-black">{memberLabel(member)}</p>
                <p className="text-xs text-muted-foreground">{memberIsOwner ? "Trip owner" : member.role ?? "PLAYER"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwner && !memberIsOwner && userId !== state.userId && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={Boolean(busyId)}
                      onClick={() => void runAction(`transfer-${userId}`, async () => {
                        await transferGroupOwnership(state.group!.id, state.userId!, userId);
                        setMessage(`${memberLabel(member)} is now the group owner.`);
                      })}
                    >
                      Make owner
                    </Button>
                    {member.role !== "ADMIN" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={Boolean(busyId)}
                        onClick={() => void runAction(`admin-${userId}`, async () => {
                          await promoteMemberToAdmin(state.group!.id, userId);
                          setMessage(`${memberLabel(member)} is now an admin.`);
                        })}
                      >
                        Make admin
                      </Button>
                    )}
                    {member.role === "ADMIN" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={Boolean(busyId)}
                        onClick={() => void runAction(`player-${userId}`, async () => {
                          await demoteMemberToPlayer(state.group!.id, userId, state.userId!);
                          setMessage(`${memberLabel(member)} is now a regular player.`);
                        })}
                      >
                        Remove admin
                      </Button>
                    )}
                  </>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={Boolean(busyId) || memberIsOwner}
                  onClick={() => void runAction(userId, async () => {
                    await deactivateGroupMember(state.group!.id, userId, {
                      nickname: memberLabel(member),
                      role: member.role
                    });
                    setMessage(`${memberLabel(member)} is now inactive in games.`);
                  })}
                >
                  {busyId === userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                  Set inactive
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {inactiveMembers.length > 0 && (
        <div className="mt-5 grid gap-3">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            Inactive ({inactiveMembers.length})
          </p>
          {inactiveMembers.map((member) => {
            const userId = member.userId || member.id;
            return (
              <div key={member.id} className="flex flex-col gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-3 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-black">{memberLabel(member)}</p>
                  <p className="text-xs text-muted-foreground">Excluded from new game actions</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={Boolean(busyId)}
                  onClick={() => void runAction(userId, async () => {
                    await reactivateGroupMember(state.group!.id, userId, {
                      nickname: memberLabel(member),
                      role: member.role
                    });
                    setMessage(`${memberLabel(member)} is active again.`);
                  })}
                >
                  {busyId === userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Reactivate
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 grid gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Invited, not joined yet ({pendingGuests.length})
        </p>
        {pendingGuests.map((slot) => (
          <div key={slot.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-background px-3 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-black">{slot.nickname}</p>
              <p className="text-xs text-muted-foreground">Waiting for invite signup</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-rose-600 sm:w-auto"
              disabled={Boolean(busyId)}
              onClick={() => void runAction(slot.id ?? slot.nickname, async () => {
                if (!slot.id) throw new Error("Unable to remove this invite slot.");
                await removePlannedMemberSlot(state.group!.id, slot.id);
                setMessage(`Removed invite slot for ${slot.nickname}.`);
              })}
            >
              Remove slot
            </Button>
          </div>
        ))}

        <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={(event) => void handleAddGuest(event)}>
          <Field
            label="Add guest nickname"
            placeholder="Example: Sam (joins for one day)"
            value={guestNickname}
            onChange={(event) => setGuestNickname(event.target.value)}
          />
          <Button type="submit" variant="secondary" className="self-end" disabled={Boolean(busyId)}>
            {busyId === "add-guest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add guest
          </Button>
        </form>
      </div>
    </>
  );

  return embedded ? body : <Card>{body}</Card>;
}
