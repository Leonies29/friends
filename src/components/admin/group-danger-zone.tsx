"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { AdminCollapsibleSection } from "@/components/admin/admin-collapsible-section";
import { Badge, Button, Card } from "@/components/ui";
import { clearActiveGroupCookie } from "@/lib/session-cookies";
import { deleteGroupPermanently, resetGroupProgress } from "@/services/group-lifecycle-service";
import { canDeleteGroup, canManageGames } from "@/services/permissions";
import type { GroupRole } from "@/types";

type GroupDangerZoneProps = {
  groupId: string;
  groupName: string;
  userId: string;
  role: GroupRole;
  onResetComplete?: () => void | Promise<void>;
};

const inputClass = "rounded-2xl border border-border bg-background px-4 py-3 font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";

export function GroupDangerZone({ groupId, groupName, userId, role, onResetComplete }: GroupDangerZoneProps) {
  const router = useRouter();
  const canReset = canManageGames(role);
  const canDelete = canDeleteGroup(role);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!canReset && !canDelete) return null;

  async function handleReset() {
    setResetting(true);
    setResetError("");
    try {
      await resetGroupProgress(groupId, userId);
      setShowResetConfirm(false);
      await onResetComplete?.();
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Unable to reset this group.");
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmName.trim() !== groupName.trim()) {
      setDeleteError("Type the exact group name to confirm deletion.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    try {
      await deleteGroupPermanently(groupId, userId);
      clearActiveGroupCookie();
      router.replace("/select-group?switch=1");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete this group.");
      setDeleting(false);
    }
  }

  return (
    <AdminCollapsibleSection
      title="Danger zone"
      emoji="⚠️"
      summary="Reset all game progress or permanently delete this group."
      defaultOpen={false}
    >
      <div className="grid gap-4">
        <Card className="border-amber-200 bg-amber-50/80 p-4 shadow-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <p className="text-sm font-semibold text-amber-900">
              These actions affect everyone in the group. Reset keeps members and the invite link. Delete removes the group forever.
            </p>
          </div>
        </Card>

        {canReset && (
          <Card className="border-border/70 p-4 shadow-none">
            <Badge>Reset progress</Badge>
            <h3 className="mt-2 text-lg font-black">Start over from zero</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Clears scores, XP, photos, challenges, assassin, bingo, quiz, awards votes, and planning events. Players stay in the group.
            </p>

            {resetError && <p className="mt-3 text-sm font-semibold text-rose-600">{resetError}</p>}

            {!showResetConfirm ? (
              <Button className="mt-4" variant="secondary" size="sm" onClick={() => setShowResetConfirm(true)}>
                <RotateCcw className="h-4 w-4" />Reset group progress
              </Button>
            ) : (
              <div className="mt-4 grid gap-2 sm:flex">
                <Button size="sm" disabled={resetting} onClick={() => void handleReset()}>
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Confirm reset
                </Button>
                <Button size="sm" variant="ghost" disabled={resetting} onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </Card>
        )}

        {canDelete && (
          <Card className="border-rose-200 bg-rose-50/50 p-4 shadow-none">
            <Badge className="border-rose-200 bg-rose-100 text-rose-800">Delete group</Badge>
            <h3 className="mt-2 text-lg font-black text-rose-950">Permanently delete this group</h3>
            <p className="mt-2 text-sm text-rose-900/80">
              Removes the group, all members, and every piece of trip data. This cannot be undone.
            </p>

            {deleteError && <p className="mt-3 text-sm font-semibold text-rose-700">{deleteError}</p>}

            {!showDeleteConfirm ? (
              <Button className="mt-4" variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4" />Delete group
              </Button>
            ) : (
              <form className="mt-4 grid max-w-md gap-3" onSubmit={(event) => void handleDelete(event)}>
                <label className="grid gap-2 text-sm font-semibold text-rose-950">
                  Type <span className="font-black">{groupName}</span> to confirm
                  <input
                    value={deleteConfirmName}
                    onChange={(event) => setDeleteConfirmName(event.target.value)}
                    className={`${inputClass} text-sm`}
                    placeholder={groupName}
                    required
                  />
                </label>
                <div className="grid gap-2 sm:flex">
                  <Button type="submit" variant="danger" size="sm" disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete forever
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>
    </AdminCollapsibleSection>
  );
}
