import { GroupScopedFeaturePage } from "@/components/group-scoped-feature-page";

export default function AwardsPage() {
  return (
    <GroupScopedFeaturePage
      title="Awards"
      eyebrow="Fun awards"
      description="Awards are generated from this group only."
      emptyTitle="No awards yet"
      emptyDescription="Awards will appear after this group creates enough memories."
      showMembers={false}
    />
  );
}
