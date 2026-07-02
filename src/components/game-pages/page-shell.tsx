"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import type { ActiveGroup } from "@/hooks/use-active-group";

export function PageShell({
  eyebrow,
  title,
  description,
  group,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  group?: ActiveGroup | null;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:gap-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-[#f6ead8]">
          <Badge>{eyebrow}</Badge>
          <h1 className="mt-3 break-words font-display text-2xl font-black leading-tight sm:mt-4 sm:text-3xl md:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">{description}</p>
          {group?.name && <p className="mt-2 truncate text-sm font-black text-primary sm:mt-3">{group.name}</p>}
        </Card>
      </motion.div>
      {children}
    </div>
  );
}

export function LoadingCard({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="flex items-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-accent" />
      <p className="font-semibold text-muted-foreground">{label}</p>
    </Card>
  );
}

export function EmptyGroupCard() {
  return (
    <Card>
      <Badge>No active group</Badge>
      <h1 className="mt-3 text-3xl font-black">Choose a group to continue</h1>
      <p className="mt-2 text-muted-foreground">Pick one of your trips, or join / create a new group.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/select-group">Choose a group</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/join">Join with invite</Link>
        </Button>
      </div>
    </Card>
  );
}
