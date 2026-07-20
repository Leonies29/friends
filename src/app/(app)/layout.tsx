import { AppShell } from "@/components/app-shell";
import { ActiveGroupGate } from "@/components/active-group-gate";
import { ActiveGroupProvider } from "@/hooks/use-active-group";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveGroupProvider>
      <ActiveGroupGate>
        <AppShell>{children}</AppShell>
      </ActiveGroupGate>
    </ActiveGroupProvider>
  );
}
