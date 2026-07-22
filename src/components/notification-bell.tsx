"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui";
import { listUserNotifications, markAllNotificationsRead } from "@/services/notification-service";
import type { UserNotification } from "@/types";

function formatDate(value: UserNotification["createdAt"]) {
  if (!value) return "";
  if (typeof value === "string") return new Date(value).toLocaleDateString("en");
  if (value instanceof Date) return value.toLocaleDateString("en");
  return new Date(value.seconds * 1000).toLocaleDateString("en");
}

export function NotificationBell({ userId }: { userId: string | null }) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void listUserNotifications(userId).then(setNotifications).catch(() => undefined);
  }, [userId]);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  async function handleToggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && unreadCount > 0) {
      const now = new Date().toISOString();
      setNotifications((items) => items.map((item) => (item.readAt ? item : { ...item, readAt: now })));
      await markAllNotificationsRead(notifications).catch(() => undefined);
    }
  }

  if (!userId) return null;

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => void handleToggle()} aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
            {unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[85vw] rounded-2xl border border-border bg-card p-3 shadow-xl">
          {notifications.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="grid max-h-80 gap-2 overflow-y-auto">
              {notifications.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
