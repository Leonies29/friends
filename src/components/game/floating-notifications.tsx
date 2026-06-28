"use client";

import { useEffect, useState } from "react";
import { Award, Bell, Zap } from "lucide-react";

const notifications = [
  { id: "xp", title: "+120 XP", detail: "Daily streak bonus claimed", icon: Zap },
  { id: "badge", title: "Achievement Ready", detail: "Explorer is one relic away", icon: Award },
  { id: "event", title: "World Event", detail: "Double XP Day is active", icon: Bell }
];

export function FloatingNotifications() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % notifications.length), 4200);
    return () => window.clearInterval(timer);
  }, []);

  const item = notifications[active];
  const Icon = item.icon;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 hidden w-80 lg:block">
      <div key={item.id} className="glass rounded-[1.5rem] p-4 shadow-2xl transition duration-300">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/20 text-accent"><Icon className="h-5 w-5" /></span>
          <div><p className="font-black">{item.title}</p><p className="text-xs font-semibold text-muted-foreground">{item.detail}</p></div>
        </div>
      </div>
    </div>
  );
}
