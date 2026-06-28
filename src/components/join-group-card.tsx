"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LogIn, UserRound } from "lucide-react";
import { Badge, Button, Field, GameCard } from "@/components/ui";

type PlannedMember = {
  nickname: string;
  claimedBy?: string | null;
};

type JoinableGroup = {
  id: string;
  name?: string;
  destination?: string;
  inviteCode?: string;
  plannedMembers?: PlannedMember[];
};

export function JoinGroupCard() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [group, setGroup] = useState<JoinableGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function findGroup() {
    const code = inviteCode.trim();
    if (!code) return;

    setLoading(true);
    setError("");

    try {
      const { getGroupByInviteCode } = await import("@/services/firebase-app-service");
      const foundGroup = await getGroupByInviteCode(code) as JoinableGroup | null;

      if (!foundGroup) {
        setGroup(null);
        setError("No group found with this invite code.");
        return;
      }

      setGroup(foundGroup);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to find this group in Firebase.");
    } finally {
      setLoading(false);
    }
  }

  function selectNickname(nickname: string) {
    if (!group) return;
    const params = new URLSearchParams({
      group: group.id,
      inviteCode: group.inviteCode ?? inviteCode.trim(),
      groupName: group.name ?? "Selected group",
      destination: group.destination ?? "",
      nickname
    });
    router.push(`/register?${params.toString()}`);
  }

  return (
    <GameCard>
      <Badge>Join Existing Group</Badge>
      <h2 className="mt-3 text-3xl font-black">Have an invite code?</h2>
      <p className="mt-2 text-muted-foreground">Enter the code from your friends, then choose the nickname prepared for you.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Invite code" placeholder="Example: SUMMER-482" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
        <Button type="button" onClick={findGroup} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Find group
        </Button>
      </div>

      {error && <p className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{error}</p>}

      {group && (
        <div className="mt-5 rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
          <Badge>Group found</Badge>
          <h3 className="mt-2 text-2xl font-black">{group.name}</h3>
          <p className="text-sm text-muted-foreground">{group.destination}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(group.plannedMembers ?? []).length ? (group.plannedMembers ?? []).map((member) => (
              <Button key={member.nickname} type="button" variant={member.claimedBy ? "secondary" : "primary"} disabled={Boolean(member.claimedBy)} onClick={() => selectNickname(member.nickname)}>
                <UserRound className="h-4 w-4" />
                {member.nickname}{member.claimedBy ? " (taken)" : ""}
              </Button>
            )) : (
              <Button type="button" onClick={() => selectNickname("")}>Continue without nickname</Button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
        <p className="font-black">Already joined a group?</p>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with your existing account. We will load the group already linked to your profile.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/login">
            <LogIn className="h-4 w-4" />
            Sign in to my group
          </Link>
        </Button>
      </div>
    </GameCard>
  );
}
