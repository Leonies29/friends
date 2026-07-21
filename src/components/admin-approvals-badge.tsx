"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { getPendingApprovalsCount, type PendingApprovals } from "@/services/admin-approvals-service";

const EMPTY: PendingApprovals = { challenges: 0, bingo: 0, assassin: 0, total: 0 };

export function AdminApprovalsBadge({ groupId, canAdmin }: { groupId: string | null; canAdmin: boolean }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<PendingApprovals>(EMPTY);

  useEffect(() => {
    if (!groupId || !canAdmin) {
      setCounts(EMPTY);
      return;
    }
    let cancelled = false;
    // Re-fetched on every navigation (not just group change) so approving something on one page
    // clears the badge once the admin lands somewhere else — this app has no live listeners for
    // approval queues, so a fresh page is the natural refresh point.
    void getPendingApprovalsCount(groupId).then((next) => {
      if (!cancelled) setCounts(next);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [groupId, canAdmin, pathname]);

  if (!canAdmin || counts.total === 0) return null;

  const parts = [
    counts.challenges > 0 ? `${counts.challenges} challenge proof${counts.challenges > 1 ? "s" : ""}` : null,
    counts.bingo > 0 ? `${counts.bingo} bingo submission${counts.bingo > 1 ? "s" : ""}` : null,
    counts.assassin > 0 ? `${counts.assassin} contested elimination${counts.assassin > 1 ? "s" : ""}` : null
  ].filter(Boolean).join(", ");

  return (
    <Link
      href="/admin"
      title={`Waiting for review: ${parts}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-black text-amber-900 transition hover:border-amber-400 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <ClipboardCheck className="h-4 w-4" />
      {counts.total} to review
    </Link>
  );
}
