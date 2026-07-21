"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { getFirebaseAuth } from "@/firebase/auth";
import { Badge, Button, Card } from "@/components/ui";
import { deleteGroupWithNotification, isSuperAdmin, listAllGroupsForSuperAdmin } from "@/services/superadmin-service";

type SuperAdminGroup = Awaited<ReturnType<typeof listAllGroupsForSuperAdmin>>[number];

const inputClass = "rounded-2xl border border-border bg-background px-4 py-3 font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";

export function SuperAdminDashboard() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [groups, setGroups] = useState<SuperAdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");

  async function loadGroups() {
    setLoading(true);
    setLoadError("");
    try {
      setGroups(await listAllGroupsForSuperAdmin());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load groups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      void (async () => {
        if (!user) {
          setAllowed(false);
          setCheckingAccess(false);
          return;
        }
        const granted = await isSuperAdmin(user.uid);
        setAllowed(granted);
        setCheckingAccess(false);
        if (granted) await loadGroups();
      })();
    });
    return () => unsubscribe();
  }, []);

  async function handleDelete(event: FormEvent<HTMLFormElement>, group: SuperAdminGroup) {
    event.preventDefault();
    if (confirmName.trim() !== group.name.trim()) {
      setDeleteError("Type the exact group name to confirm deletion.");
      return;
    }

    setDeletingId(group.id);
    setDeleteError("");
    try {
      await deleteGroupWithNotification(group.id, group.name);
      setGroups((items) => items.filter((item) => item.id !== group.id));
      setConfirmId(null);
      setConfirmName("");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unable to delete this group.");
    } finally {
      setDeletingId(null);
    }
  }

  if (checkingAccess) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="flex items-center gap-3 px-6 py-5">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <p className="font-semibold text-muted-foreground">Checking access...</p>
        </Card>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="max-w-md">
          <Badge>Restricted</Badge>
          <h1 className="mt-3 text-2xl font-black">This area is for the app developer only</h1>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-6 sm:px-4 sm:py-8 md:px-8">
      <section className="mx-auto grid max-w-3xl gap-4 sm:gap-6">
        <Card className="bg-primary text-primary-foreground">
          <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Dev</Badge>
          <h1 className="mt-3 font-display text-3xl font-black">All trips</h1>
          <p className="mt-2 text-sm text-primary-foreground/80">Every group created in the app, across all users.</p>
        </Card>

        {loadError && <Card className="border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700">{loadError}</Card>}

        <Card>
          <div className="flex items-center justify-between">
            <Badge>{groups.length} groups</Badge>
            <Button variant="secondary" size="sm" disabled={loading} onClick={() => void loadGroups()}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </Card>

        {loading ? (
          <Card className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <p className="font-semibold text-muted-foreground">Loading groups...</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {groups.map((group) => (
              <Card key={group.id} className="border-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.destination || "No destination"} · {group.memberCount} players
                    </p>
                    {group.ownerEmail && <p className="text-xs text-muted-foreground">Owner: {group.ownerEmail}</p>}
                  </div>
                  {confirmId !== group.id && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setConfirmId(group.id);
                        setConfirmName("");
                        setDeleteError("");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />Delete forever
                    </Button>
                  )}
                </div>

                {confirmId === group.id && (
                  <form className="mt-4 grid max-w-md gap-3" onSubmit={(event) => void handleDelete(event, group)}>
                    <label className="grid gap-2 text-sm font-semibold text-rose-950">
                      Type <span className="font-black">{group.name}</span> to confirm
                      <input
                        value={confirmName}
                        onChange={(event) => setConfirmName(event.target.value)}
                        className={`${inputClass} text-sm`}
                        placeholder={group.name}
                        required
                      />
                    </label>
                    {deleteError && <p className="text-sm font-semibold text-rose-600">{deleteError}</p>}
                    <div className="grid gap-2 sm:flex">
                      <Button type="submit" variant="danger" size="sm" disabled={deletingId === group.id}>
                        {deletingId === group.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete forever
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={deletingId === group.id} onClick={() => setConfirmId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            ))}
            {groups.length === 0 && <p className="text-sm text-muted-foreground">No groups exist yet.</p>}
          </div>
        )}
      </section>
    </main>
  );
}
