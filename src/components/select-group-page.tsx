"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Archive, Loader2, MapPin, Plus, RotateCcw, Users } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/auth";
import { clearActiveGroupCookie, setActiveGroupCookie } from "@/lib/session-cookies";
import {
  activateGroupForUser,
  archiveUserGroup,
  listArchivedUserGroups,
  listUserMembershipGroups,
  restoreUserGroup
} from "@/services/group-service";
import type { Group } from "@/types";
import { Badge, Button, Card } from "@/components/ui";

export function SelectGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allowSwitch = searchParams.get("switch") === "1";
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [archivedGroups, setArchivedGroups] = useState<Group[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const reloadGroups = useCallback(async (currentUserId: string) => {
    const [memberships, archived] = await Promise.all([
      listUserMembershipGroups(currentUserId),
      listArchivedUserGroups(currentUserId)
    ]);
    setGroups(memberships);
    setArchivedGroups(archived);
    return memberships;
  }, []);

  const chooseGroup = useCallback(async (currentUserId: string, groupId: string, silent = false) => {
    if (!silent) setSubmittingId(groupId);
    setError("");

    try {
      await activateGroupForUser(currentUserId, groupId);
      setActiveGroupCookie(groupId);
      router.replace("/dashboard");
    } catch (chooseError) {
      setError(chooseError instanceof Error ? chooseError.message : "Unable to open this group.");
      setSubmittingId(null);
      if (silent) setLoading(false);
    }
  }, [router]);

  const openDashboard = useCallback((groupId: string) => {
    setActiveGroupCookie(groupId);
    router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      void (async () => {
        if (!user) {
          router.replace("/login");
          return;
        }

        setUserId(user.uid);

        let redirecting = false;
        try {
          const [{ doc, getDoc }, { getFirebaseFirestore }] = await Promise.all([
            import("firebase/firestore"),
            import("@/firebase/firestore")
          ]);
          const db = getFirebaseFirestore();
          const userSnapshot = await getDoc(doc(db, "users", user.uid));
          const currentActiveGroupId = userSnapshot.exists()
            ? (userSnapshot.data().activeGroupId as string | undefined) ?? null
            : null;
          setActiveGroupId(currentActiveGroupId);

          const memberships = await reloadGroups(user.uid);

          if (memberships.length === 1 && !allowSwitch) {
            redirecting = true;
            const singleGroup = memberships[0];
            if (currentActiveGroupId === singleGroup.id) {
              openDashboard(singleGroup.id);
              return;
            }
            await chooseGroup(user.uid, singleGroup.id, true);
            return;
          }
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your groups.");
        } finally {
          if (!redirecting) setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, [allowSwitch, chooseGroup, openDashboard, reloadGroups, router]);

  async function hideGroup(groupId: string) {
    if (!userId) return;
    setArchivingId(groupId);
    setError("");

    try {
      await archiveUserGroup(userId, groupId);
      if (activeGroupId === groupId) {
        clearActiveGroupCookie();
        setActiveGroupId(null);
      }
      await reloadGroups(userId);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to hide this group.");
    } finally {
      setArchivingId(null);
    }
  }

  async function unhideGroup(groupId: string) {
    if (!userId) return;
    setArchivingId(groupId);
    setError("");

    try {
      await restoreUserGroup(userId, groupId);
      await reloadGroups(userId);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Unable to restore this group.");
    } finally {
      setArchivingId(null);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="flex items-center gap-3 px-6 py-5">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <p className="font-black">Loading your trips...</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-6 sm:px-4 sm:py-8 md:px-8">
      <section className="mx-auto grid max-w-3xl gap-4 sm:gap-6">
        <div className="turkish-tile premium-border rounded-[1.75rem] bg-primary p-5 text-primary-foreground shadow-2xl sm:rounded-[2.5rem] sm:p-8">
          <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Choose your adventure</Badge>
          <h1 className="mt-3 font-display text-3xl font-black leading-tight sm:mt-4 sm:text-5xl md:text-6xl">Pick a group</h1>
          <p className="mt-3 text-sm font-semibold text-primary-foreground/85 sm:mt-4 sm:text-lg">
            Your account can join several friend trips. Select the one you want to play in right now.
          </p>
        </div>

        {error && (
          <Card className="border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</Card>
        )}

        {groups.length > 0 ? (
          <div className="grid gap-3">
            {groups.map((group) => {
              const isActive = group.id === activeGroupId;
              const isSubmitting = submittingId === group.id;
              return (
                <Card key={group.id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.25rem] bg-accent/15 text-3xl">
                      🧭
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-xl font-black sm:text-2xl">{group.name}</h2>
                        {isActive && <Badge>Current</Badge>}
                      </div>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {group.destination || "Trip destination"}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {group.memberIds?.length ?? 0} players
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0">
                      <Button
                        size="lg"
                        className="w-full"
                        disabled={Boolean(submittingId) || Boolean(archivingId)}
                        onClick={() => userId && void chooseGroup(userId, group.id)}
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        {isActive && !allowSwitch ? "Continue" : "Play here"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        disabled={Boolean(submittingId) || archivingId === group.id}
                        onClick={() => void hideGroup(group.id)}
                      >
                        {archivingId === group.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                        Hide group
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="grid gap-4 p-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/15 text-4xl">🧭</div>
            <div>
              <h2 className="text-2xl font-black">No group yet</h2>
              <p className="mt-2 text-muted-foreground">Create a new trip or join one with an invite code.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="secondary">
                <Link href="/create-group">
                  <Plus className="h-4 w-4" />
                  Create a group
                </Link>
              </Button>
              <Button asChild>
                <Link href="/join">Join with invite code</Link>
              </Button>
            </div>
          </Card>
        )}

        {archivedGroups.length > 0 && (
          <Card className="p-5">
            <Badge>Hidden</Badge>
            <p className="mt-2 text-sm text-muted-foreground">Groups you archived. Restore them anytime.</p>
            <div className="mt-4 grid gap-3">
              {archivedGroups.map((group) => (
                <div key={group.id} className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-3 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-black">{group.name}</p>
                    <p className="text-sm text-muted-foreground">{group.destination || "Trip destination"}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={archivingId === group.id}
                    onClick={() => void unhideGroup(group.id)}
                  >
                    {archivingId === group.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {groups.length > 0 && (
          <Card className="grid gap-3 p-5 sm:grid-cols-2">
            <div>
              <Badge>New trip</Badge>
              <p className="mt-2 font-black">Start another adventure</p>
              <p className="text-sm text-muted-foreground">Create a fresh group for a new destination.</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end sm:self-end">
              <Button asChild variant="secondary" size="sm">
                <Link href="/create-group">Create group</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/join">Join group</Link>
              </Button>
            </div>
          </Card>
        )}
      </section>
    </main>
  );
}
