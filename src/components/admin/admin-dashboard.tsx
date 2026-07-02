"use client";

import { FormEvent, useEffect, useState } from "react";
import { Copy, Loader2, Minus, Plus } from "lucide-react";
import { AssassinEmergencyPanel } from "@/components/admin/assassin-emergency-panel";
import { AwardsRevealSection } from "@/components/admin/awards-reveal-section";
import { GameManagementPanel } from "@/components/game-management-panel";
import { Badge, Button, Card } from "@/components/ui";
import { buildInviteLink } from "@/lib/app-paths";
import { useActiveGroup, type ActiveGroup, type GroupMember } from "@/hooks/use-active-group";
import { canManageGames, canManageScores, resolveEffectiveRole } from "@/services/permissions";
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
      <h1 className="mt-4 font-display text-4xl font-black leading-none md:text-5xl">Trip control center</h1>
      <p className="mt-4 max-w-2xl text-primary-foreground/75">
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

  const role = resolveEffectiveRole(state.currentMember, state.group, state.userId);
  const canAdmin = canManageGames(role) || canManageScores(role);

  async function loadAdmin(groupId = state.group?.id) {
    if (!groupId) return;
    setLoadingGames(true);
    setLoadError("");
    try {
      setGames(await ensureDefaultGames(groupId));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load games.");
    } finally {
      setLoadingGames(false);
    }
  }

  useEffect(() => { void loadAdmin(); }, [state.group?.id]);

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
        <p className="mt-2 text-muted-foreground">Ask the trip owner to grant you admin rights in Firebase if needed.</p>
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

  const inviteCode = group.inviteCode ?? "";

  return (
    <div className="grid gap-6">
      <AdminHero group={group} />

      <Card>
        <Badge>Invitation</Badge>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Invite code</p>
            <p className="text-2xl font-black">{inviteCode}</p>
            <p className="mt-2 break-all text-sm font-semibold text-muted-foreground">{inviteLink || buildInviteLink(inviteCode)}</p>
          </div>
          <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(inviteLink || buildInviteLink(inviteCode))}>
            <Copy className="h-4 w-4" />Copy link
          </Button>
        </div>
      </Card>

      {loadError && (
        <Card className="border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700">
          {loadError}
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => void loadAdmin(group.id)}>Retry</Button>
        </Card>
      )}

      {loadingGames ? (
        <Card className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <p className="font-semibold text-muted-foreground">Loading games...</p>
        </Card>
      ) : (
        <GameManagementPanel groupId={group.id} games={games} onReload={async () => { await loadAdmin(group.id); }} />
      )}

      <AssassinEmergencyPanel groupId={group.id} members={state.members} />

      {canManageScores(role) && (
        <Card>
          <Badge>Score adjustments</Badge>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]" onSubmit={(event) => void handleXp(event, 1)}>
            <select name="userId" required className={inputClass}>
              <option value="">Choose player</option>
              {state.members.map((member) => (
                <option key={member.id} value={member.userId || member.id}>{memberName(member)}</option>
              ))}
            </select>
            <input name="amount" type="number" min={1} required placeholder="XP" className={inputClass} />
            <input name="reason" placeholder="Reason" className={inputClass} />
            <Button type="submit"><Plus className="h-4 w-4" />Add XP</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={(event) => {
                const form = event.currentTarget.closest("form");
                if (form) void handleXp({ preventDefault: () => undefined, currentTarget: form } as FormEvent<HTMLFormElement>, -1);
              }}
            >
              <Minus className="h-4 w-4" />Remove XP
            </Button>
          </form>
        </Card>
      )}

      <AwardsRevealSection members={state.members} groupId={group.id} />
    </div>
  );
}
