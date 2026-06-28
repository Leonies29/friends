import { GroupScopedFeaturePage } from "@/components/group-scoped-feature-page";

export default function AssassinPage() {
  return (
    <GroupScopedFeaturePage
      title="Assassin"
      eyebrow="Assassin mode"
      description="Targets and eliminations belong only to this group."
      emptyTitle="No assassin game yet"
      emptyDescription="Start the assassin game later to generate group-specific missions."
      showMembers={true}
    />
  );
}
