import { AdminAwardsPage } from "@/components/game-pages/admin-awards-page";
import { AssassinAdminPage } from "@/components/game-pages/assassin-admin-page";
import { GroupAdminPage } from "@/components/group-crud-pages";

export default function AdminRoute() {
  return (
    <div className="grid gap-8">
      <GroupAdminPage />
      <AssassinAdminPage />
      <AdminAwardsPage />
    </div>
  );
}
