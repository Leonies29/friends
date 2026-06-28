import { Castle, MapPin } from "lucide-react";
import { Badge, GameCard } from "@/components/ui";
import { cn } from "@/lib/utils";

const stops = [
  { name: "Sultanahmet", x: 14, y: 62, status: "complete" },
  { name: "Grand Bazaar", x: 31, y: 45, status: "complete" },
  { name: "Galata", x: 47, y: 35, status: "active" },
  { name: "Karakoy Ferry", x: 61, y: 52, status: "active" },
  { name: "Kadikoy", x: 82, y: 38, status: "locked" }
];

export function JourneyMap() {
  return (
    <GameCard className="overflow-hidden p-0">
      <div className="border-b border-border p-5">
        <Badge>Journey Map</Badge>
        <h2 className="mt-3 text-3xl font-black">Istanbul Adventure Route</h2>
        <p className="mt-2 text-sm text-muted-foreground">A premium quest map for the week: landmarks, ferries, bazaars, and suspiciously powerful cats.</p>
      </div>
      <div className="relative min-h-[360px] overflow-hidden bg-primary text-primary-foreground">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="mapSea" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#174675" />
              <stop offset="100%" stopColor="#0b1f39" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#mapSea)" />
          <path d="M0 68 C18 55 26 72 43 60 C58 48 66 66 100 49 L100 100 L0 100 Z" fill="rgba(255,247,232,0.14)" />
          <path d="M0 31 C17 18 33 33 49 23 C66 12 75 25 100 14 L100 0 L0 0 Z" fill="rgba(255,247,232,0.10)" />
          <path className="map-route" d="M14 62 C26 44 35 50 47 35 S68 48 82 38" fill="none" stroke="#f1bd59" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        {stops.map((stop) => (
          <div key={stop.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${stop.x}%`, top: `${stop.y}%` }}>
            <div className={cn("grid h-12 w-12 place-items-center rounded-full border border-white/30 shadow-2xl", stop.status === "locked" ? "bg-white/15 text-white/50" : stop.status === "active" ? "bg-accent text-slate-950" : "bg-white/20 text-white")}>
              <MapPin className="h-6 w-6" />
            </div>
            <p className="mt-2 whitespace-nowrap rounded-full bg-black/20 px-3 py-1 text-center text-xs font-black backdrop-blur">{stop.name}</p>
          </div>
        ))}
        <Castle className="absolute bottom-6 right-8 h-20 w-20 text-white/10" />
      </div>
    </GameCard>
  );
}
