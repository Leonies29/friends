import { AppShell } from "@/components/app-shell";
import { ActiveGroupGate } from "@/components/active-group-gate";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveGroupGate>
      <AppShell>{children}</AppShell>
    </ActiveGroupGate>
  );
}
