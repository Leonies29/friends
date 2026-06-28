"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Badge, Button, Field, GameCard } from "@/components/ui";

export function JoinGroupCard() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");

  function joinGroup() {
    const code = inviteCode.trim();
    if (!code) return;
    router.push(`/login?inviteCode=${encodeURIComponent(code)}&group=${encodeURIComponent(code)}`);
  }

  return (
    <GameCard>
      <Badge>Join Existing Group</Badge>
      <h2 className="mt-3 text-3xl font-black">Have an invite code?</h2>
      <p className="mt-2 text-muted-foreground">Enter the code from your friends to connect or create an account linked to that travel group.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Invite code" placeholder="Example: SUMMER-482" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
        <Button type="button" onClick={joinGroup}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </GameCard>
  );
}
