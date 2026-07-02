"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";
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
    <div className="grid gap-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-[#f6ead8]">
          <Badge>{eyebrow}</Badge>
          <h1 className="mt-4 font-display text-4xl font-black leading-none md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
          {group?.name && <p className="mt-3 text-sm font-black text-primary">{group.name}</p>}
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
      <h1 className="mt-3 text-3xl font-black">Join or create a group first</h1>
      <p className="mt-2 text-muted-foreground">This page only works inside your active trip group.</p>
    </Card>
  );
}
