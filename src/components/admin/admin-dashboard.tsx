"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Copy, Loader2, Minus, Plus } from "lucide-react";
import { AssassinEmergencySection } from "@/components/admin/assassin-emergency-panel";
import { AwardsRevealSection } from "@/components/admin/awards-reveal-section";
import { AdminCollapsibleSection } from "@/components/admin/admin-collapsible-section";
import { GroupDangerZone } from "@/components/admin/group-danger-zone";
import { MembersManagementPanel } from "@/components/admin/members-management-panel";
import { GameManagementPanel } from "@/components/game-management-panel";
import { Badge, Button, Card } from "@/components/ui";
import { buildInviteLink } from "@/lib/app-paths";
import { formatFirestoreError } from "@/lib/firebase-errors";
import { filterActiveGameMembers } from "@/lib/game-members";
import { useActiveGroup, type ActiveGroup, type GroupMember } from "@/hooks/use-active-group";
import { canManageGames, canManageMembers, canManageScores, resolveEffectiveRole } from "@/services/permissions";
import { ensureAwardCategories } from "@/services/award-service";
import { ensureDefaultGames } from "@/services/game-service";
import { addXpTransaction } from "@/services/xp-service";
import type { Game } from "@/types";

const inputClass = "rounded-2xl border border-border bg-background px-4 py-3 font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";

function memberName(member?: GroupMember | null) {
  return member?.nickname || member?.username || "Group member";
}

function AdminHero({ group }: { group: ActiveGroup }) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Admin</Badge>
      <h1 className="mt-3 break-words font-display text-2xl font-black leading-tight sm:mt-4 sm:text-3xl md:text-5xl">Trip control center</h1>
      <p className="mt-3 text-sm text-primary-foreground/75 sm:mt-4 sm:text-base">
        Invite friends, configure each game with ⚙️, activate with ▶️, then adjust scores or reveal awards.
      </p>
      <p className="mt-4 text-sm font-black text-primary-foreground/70">{group.name ?? "Active group"}</p>
    </Card>
  );
}

export function AdminDashboard() {
  const state = useActiveGroup();
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const role = resolveEffectiveRole(state.currentMember, state.group, state.userId, state.currentMember?.email);
  const canAdmin = canManageGames(role) || canManageScores(role) || canManageMembers(role);
  const canMembers = canManageMembers(role);
  const activeMembers = filterActiveGameMembers(state.members);

  async function loadAdmin(groupId = state.group?.id) {
    if (!groupId || !state.userId) return;
    setLoadingGames(true);
    setLoadError("");
    try {
      const { prepareGroupAdminAccess } = await import("@/services/group-service");
      await prepareGroupAdminAccess(groupId, state.userId, {
        appRole: role,
        email: state.currentMember?.email,
        nickname: state.currentMember?.nickname
      });
      const [nextGames] = await Promise.all([
        ensureDefaultGames(groupId),
        ensureAwardCategories(groupId).catch(() => undefined)
      ]);
      setGames(nextGames);
    } catch (error) {
      setLoadError(formatFirestoreError(error, "Unable to load games."));
    } finally {
      setLoadingGames(false);
    }
  }

  useEffect(() => { void loadAdmin(); }, [state.group?.id, state.userId]);

  useEffect(() => {
    if (state.group?.inviteCode) {
      setInviteLink(buildInviteLink(state.group.inviteCode));
    }
  }, [state.group?.inviteCode]);

  if (state.loading) {
    return (
      <Card className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="font-semibold text-muted-foreground">Loading admin...</p>
      </Card>
    );
  }

  if (state.error) {
    return <Card className="text-sm font-semibold text-rose-600">{state.error}</Card>;
  }

  if (!state.group) {
    return (
      <Card>
        <Badge>No active group</Badge>
        <h1 className="mt-3 text-3xl font-black">Join or create a group first</h1>
      </Card>
    );
  }

  if (!canAdmin) {
    return (
      <Card>
        <Badge>Player access</Badge>
        <h1 className="mt-3 text-3xl font-black">Admin is for owners and admins</h1>
        <p className="mt-2 text-muted-foreground">Ask the trip owner to grant you admin rights if needed.</p>
      </Card>
    );
  }

  const group = state.group;

  async function handleXp(event: FormEvent<HTMLFormElement>, amountSign: 1 | -1) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Math.abs(Number(form.get("amount") ?? 0)) * amountSign;
    const userId = String(form.get("userId") ?? "");
    if (!state.userId || !userId || !amount) return;
    await addXpTransaction({
      groupId: group.id,
      userId,
      amount,
      sourceType: "admin_adjustment",
      reason: String(form.get("reason") ?? "Admin correction"),
      createdBy: state.userId
    });
    event.currentTarget.reset();
  }

  async function handleCopyInviteLink() {
    const nextLink = inviteLink || buildInviteLink(inviteCode);
    try {
      await navigator.clipboard?.writeText(nextLink);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(false);
    }
  }

  const inviteCode = group.inviteCode ?? "";

  return (
    <div className="grid gap-4 sm:gap-5">
      <AdminHero group={group} />

      {loadError && (
        <Card className="border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700">
          {loadError}
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => void loadAdmin(group.id)}>Retry</Button>
        </Card>
      )}

      <AdminCollapsibleSection
        title="Games"
        emoji="🎮"
        summary="Configure, activate, and create trip games."
      >
        {loadingGames ? (
          <Card className="flex items-center gap-3 border-0 p-0 shadow-none">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <p className="font-semibold text-muted-foreground">Loading games...</p>
          </Card>
        ) : (
          <GameManagementPanel groupId={group.id} games={games} onReload={async () => { await loadAdmin(group.id); }} embedded />
        )}
      </AdminCollapsibleSection>

      {canMembers && (
        <AdminCollapsibleSection
          title="Players"
          emoji="👥"
          summary="Activate guests, deactivate players, and manage invite slots."
        >
          <MembersManagementPanel embedded />
        </AdminCollapsibleSection>
      )}

      <AssassinEmergencySection groupId={group.id} members={state.members} />

      <AdminCollapsibleSection
        title="Awards"
        emoji="🏅"
        summary="Reveal winners and manage which award categories are visible."
      >
        <AwardsRevealSection members={state.members} groupId={group.id} embedded />
      </AdminCollapsibleSection>

      <AdminCollapsibleSection
        title="Invitation"
        emoji="🔗"
        summary="Share the invite code and link with your friends."
      >
        <div className="grid gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Invite code</p>
            <p className="text-xl font-black">{inviteCode}</p>
            <p className="mt-2 break-all text-xs font-semibold text-muted-foreground">{inviteLink || buildInviteLink(inviteCode)}</p>
          </div>
          <Button
            variant={copiedLink ? "primary" : "secondary"}
            size="sm"
            className={`w-full sm:w-fit ${copiedLink ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            onClick={() => void handleCopyInviteLink()}
          >
            {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedLink ? "Link copied" : "Copy link"}
          </Button>
          {copiedLink && <p className="text-sm font-semibold text-emerald-700">The invite link has been copied.</p>}
        </div>
      </AdminCollapsibleSection>

      {state.userId && (
        <GroupDangerZone
          groupId={group.id}
          groupName={group.name ?? "Active group"}
          userId={state.userId}
          userEmail={state.currentMember?.email}
          role={role}
          onResetComplete={async () => { await loadAdmin(group.id); }}
        />
      )}

      {canManageScores(role) && (
        <AdminCollapsibleSection
          title="Score adjustments"
          emoji="⭐"
          summary="Add or remove XP for a player."
        >
          <form className="grid max-w-md gap-3" onSubmit={(event) => void handleXp(event, 1)}>
            <select name="userId" required className={`${inputClass} w-full text-sm`}>
              <option value="">Choose player</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.userId || member.id}>{memberName(member)}</option>
              ))}
            </select>
            <div className="grid gap-3">
              <input name="amount" type="number" min={1} required placeholder="XP" className={`${inputClass} text-sm`} />
              <input name="reason" placeholder="Reason" className={`${inputClass} text-sm`} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="submit" size="sm"><Plus className="h-4 w-4" />Add XP</Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(event) => {
                  const form = event.currentTarget.closest("form");
                  if (form) void handleXp({ preventDefault: () => undefined, currentTarget: form } as FormEvent<HTMLFormElement>, -1);
                }}
              >
                <Minus className="h-4 w-4" />Remove XP
              </Button>
            </div>
          </form>
        </AdminCollapsibleSection>
      )}
    </div>
  );
}
