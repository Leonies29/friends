import { GroupScopedFeaturePage } from "@/components/group-scoped-feature-page";

export default function BadgesPage() {
  return (
    <GroupScopedFeaturePage
      title="Relics"
      eyebrow="Badges"
      description="Achievements are scoped to this group journey."
      emptyTitle="No badges unlocked yet"
      emptyDescription="Every new group starts with zero unlocked group badges."
      showMembers={false}
    />
  );
}
