"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Copy, Loader2, LogIn, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Badge, Button, Card, Field } from "@/components/ui";

const gameModes = [
  "Daily secret challenges",
  "Assassin game",
  "Photo wall",
  "City questline",
  "Badges and XP",
  "End-of-trip awards",
  "Hidden cats"
];

const tripVibes = [
  "Funny",
  "Chill",
  "Chaotic",
  "Adventure",
  "Nightlife",
  "Foodies",
  "Culture",
  "Premium",
  "Photo trip",
  "Competitive"
];

export function CreateGroupForm() {
  const [groupName, setGroupName] = useState("");
  const [destination, setDestination] = useState("");
  const [groupId, setGroupId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [friendNicknames, setFriendNicknames] = useState<string[]>([""]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(["Funny", "Adventure"]);
  const [created, setCreated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const displayName = groupName.trim() || "Your new quest group";
  const displayDestination = destination.trim() || "your destination";
  const groupQuery = useMemo(() => {
    const params = new URLSearchParams({
      group: groupId || "new-group",
      inviteCode: inviteCode || "new-group",
      groupName: displayName,
      destination: displayDestination
    });
    return params.toString();
  }, [displayDestination, displayName, groupId, inviteCode]);
  const registerHref = `/register?${groupQuery}`;
  const loginHref = `/login?${groupQuery}`;

  async function handleCreate(formData: FormData) {
    setSaving(true);
    setError("");

    try {
      const selectedGameModes = formData.getAll("gameModes").map(String);
      const { createFriendGroup } = await import("@/services/firebase-app-service");
      const group = await createFriendGroup({
        name: String(formData.get("groupName") ?? ""),
        destination: String(formData.get("destination") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        invitees: "",
        friendNicknames: friendNicknames.map((item) => item.trim()).filter(Boolean),
        vibe: selectedVibes.join(", "),
        gameModes: selectedGameModes
      });

      setGroupId(group.id);
      setInviteCode(group.inviteCode);
      setCreated(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create the group in Firebase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <Badge>Group Setup</Badge>
        <h2 className="mt-3 text-3xl font-black">Blank Group Builder</h2>
        <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); void handleCreate(new FormData(event.currentTarget)); }}>
          <Field name="groupName" label="Group name" placeholder="Example: Summer Crew 2026" value={groupName} onChange={(event) => setGroupName(event.target.value)} required />
          <Field name="destination" label="Destination" placeholder="Example: Lisbon, Portugal" value={destination} onChange={(event) => setDestination(event.target.value)} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="startDate" label="Start date" type="date" />
            <Field name="endDate" label="End date" type="date" />
          </div>
          <div className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black">Friends nicknames</p>
                <p className="text-sm text-muted-foreground">Add the exact nickname each friend will choose when joining with the invite code.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setFriendNicknames((items) => [...items, ""])}>
                <Plus className="h-4 w-4" />
                Add friend
              </Button>
            </div>
            <div className="mt-4 grid gap-3">
              {friendNicknames.map((nickname, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Field
                    label={`Friend ${index + 1}`}
                    placeholder="Example: Yaman, Leonie, Marko..."
                    value={nickname}
                    onChange={(event) => setFriendNicknames((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-end text-rose-500"
                    onClick={() => setFriendNicknames((items) => items.length === 1 ? [""] : items.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
            <p className="font-black">Trip vibe</p>
            <p className="mt-1 text-sm text-muted-foreground">Select the mood of the trip. You can choose several.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tripVibes.map((vibe) => {
                const selected = selectedVibes.includes(vibe);
                return (
                  <button
                    key={vibe}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-sm font-black transition ${selected ? "border-accent bg-accent text-slate-950" : "border-border bg-background/70 text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setSelectedVibes((items) => selected ? items.filter((item) => item !== vibe) : [...items, vibe])}
                  >
                    {vibe}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
            <p className="font-black">Game modes</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {gameModes.map((mode) => (
                <label key={mode} className="flex items-center gap-3 rounded-2xl bg-background/70 p-3 text-sm font-semibold">
                  <input name="gameModes" value={mode} type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--accent)]" />
                  {mode}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Creating in Firebase..." : "Create Group Space"}
            </Button>
            <Button asChild type="button" variant="secondary" size="lg">
              <Link href="/">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>

      {created && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-[2rem] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" onClick={() => setCreated(false)} aria-label="Close popup">
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="mt-5 font-display text-4xl font-black">Group created</h3>
            <p className="mt-3 text-muted-foreground">
              <strong className="text-foreground">{displayName}</strong> is ready for {displayDestination}. Next, connect an existing account or create a new account linked to this group.
            </p>

            <div className="mt-5 rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Invite Code</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-3xl font-black">{inviteCode}</p>
                <Button type="button" variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(inviteCode)}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg">
                <Link href={loginHref}>
                  <LogIn className="h-4 w-4" />
                  Connect existing account
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href={registerHref}>
                  <UserPlus className="h-4 w-4" />
                  Create linked account
                </Link>
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setCreated(false)}>
              Keep editing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
